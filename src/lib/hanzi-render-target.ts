import type { Point, RenderTargetInitFunction } from "hanzi-writer";

type BoundEvent = { getPoint(): Point; preventDefault(): void };
const SVG_NS = "http://www.w3.org/2000/svg";

// Use Hanzi Writer's renderer extension point so pointer handlers have an explicit
// lifetime. The default v3.6.1 target attaches permanent document mouse/touch handlers.
class HanziRenderTarget {
  node: SVGElement;
  private pointer: number | null = null;
  constructor(public svg: SVGElement, public defs: SVGDefsElement, private signal: AbortSignal, private root: SVGSVGElement) { this.node = svg; }
  createSubRenderTarget() {
    const group = document.createElementNS(SVG_NS, "g");
    this.svg.appendChild(group);
    return new HanziRenderTarget(group, this.defs, this.signal, this.root);
  }
  addPointerStartListener(callback: (event: BoundEvent) => void) {
    this.node.addEventListener("pointerdown", event => {
      if (!event.isPrimary || event.button !== 0) return;
      this.pointer = event.pointerId;
      this.node.setPointerCapture(event.pointerId);
      callback(this._eventify(event, this._getMousePoint));
    }, { signal: this.signal });
  }
  addPointerMoveListener(callback: (event: BoundEvent) => void) {
    this.node.addEventListener("pointermove", event => {
      if (this.pointer === event.pointerId) callback(this._eventify(event, this._getMousePoint));
    }, { signal: this.signal });
  }
  addPointerEndListener(callback: () => void) {
    const finish = (event: PointerEvent) => {
      if (this.pointer !== event.pointerId) return;
      this.pointer = null;
      callback();
    };
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"] as const) this.node.addEventListener(name, finish, { signal: this.signal });
  }
  getBoundingClientRect() { return this.node.getBoundingClientRect(); }
  updateDimensions(width: string | number, height: string | number) { this.svg.setAttribute("width", String(width)); this.svg.setAttribute("height", String(height)); }
  _eventify<T extends Event>(event: T, point: (event: T) => Point): BoundEvent {
    return { getPoint: () => point.call(this, event), preventDefault: () => event.preventDefault() };
  }
  _getMousePoint(event: MouseEvent): Point {
    const rect = this.root.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * this.root.width.baseVal.value / (rect.width || 1), y: (event.clientY - rect.top) * this.root.height.baseVal.value / (rect.height || 1) };
  }
  _getTouchPoint(event: TouchEvent): Point {
    const touch = event.touches[0];
    if (!touch) return { x: 0, y: 0 };
    return this._getMousePoint({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }
}

export function hanziRenderTarget(signal: AbortSignal): RenderTargetInitFunction<SVGElement> {
  return (element, width = 320, height = 320) => {
    const host = typeof element === "string" ? document.getElementById(element) : element;
    if (!host) throw new Error("Không mở được ô luyện viết.");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
    svg.style.display = "block"; svg.style.touchAction = "none";
    const defs = document.createElementNS(SVG_NS, "defs");
    svg.appendChild(defs); host.appendChild(svg);
    return new HanziRenderTarget(svg, defs, signal, svg);
  };
}
