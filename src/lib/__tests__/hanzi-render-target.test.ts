/** @jest-environment jsdom */
import HanziWriter from "hanzi-writer";
import { hanziRenderTarget } from "../hanzi-render-target";

const data = {
  strokes: ["M 200 200 L 800 200", "M 500 200 L 500 800", "M 200 800 L 800 800"],
  medians: [[[200, 200], [800, 200]], [[500, 200], [500, 800]], [[200, 800], [800, 800]]],
};
let events: AbortController;
let writer: HanziWriter;
let svg: SVGSVGElement;
let cssSize: number;

beforeEach(async () => {
  jest.useFakeTimers();
  events = new AbortController(); cssSize = 320;
  const host = document.createElement("div"); document.body.appendChild(host);
  writer = new HanziWriter(host, {
    width: 320, height: 320, padding: 20, charDataLoader: () => data,
    showCharacter: false, showOutline: true, highlightOnComplete: false,
    strokeFadeDuration: 0, drawingFadeDuration: 0, showHintAfterMisses: false,
    rendererOverride: { createRenderTarget: hanziRenderTarget(events.signal) },
  });
  svg = host.querySelector("svg")!;
  svg.setPointerCapture = jest.fn();
  Object.defineProperty(svg, "width", { get: () => ({ baseVal: { value: Number(svg.getAttribute("width")) } }) });
  Object.defineProperty(svg, "height", { get: () => ({ baseVal: { value: Number(svg.getAttribute("height")) } }) });
  svg.getBoundingClientRect = () => ({ left: 10, top: 20, width: cssSize, height: cssSize, right: 10 + cssSize, bottom: 20 + cssSize, x: 10, y: 20, toJSON: () => ({}) });
  await writer.setCharacter("上");
});
afterEach(() => { writer.cancelQuiz(); events.abort(); jest.clearAllTimers(); jest.useRealTimers(); document.body.replaceChildren(); });

function pointer(name: string, x: number, y: number, primary = true) {
  const event = new MouseEvent(name, { bubbles: true, cancelable: true, clientX: 10 + x, clientY: 20 + y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: primary } });
  svg.dispatchEvent(event);
}

async function drawStroke(median: number[][]) {
  const transform = HanziWriter.getScalingTransform(320, 320, 20);
  const points = median.map(([x, y]) => [(transform.x + x! * transform.scale) * cssSize / 320, (320 - transform.y - y! * transform.scale) * cssSize / 320]);
  pointer("pointerdown", points[0]![0]!, points[0]![1]!);
  for (const [x, y] of points.slice(1)) pointer("pointermove", x!, y!);
  pointer("pointerup", points.at(-1)![0]!, points.at(-1)![1]!);
  await jest.advanceTimersByTimeAsync(600);
}

it("accepts strokes in order and completes a character using the Hanzi Writer engine", async () => {
  const correct = jest.fn(), complete = jest.fn();
  await writer.quiz({ onCorrectStroke: correct, onComplete: complete });
  for (const median of data.medians) await drawStroke(median);
  expect(correct).toHaveBeenCalledTimes(3);
  expect(complete).toHaveBeenCalledWith({ character: "上", totalMistakes: 0 });
});

it("grades pointer coordinates correctly when the board is displayed at half size", async () => {
  cssSize = 160;
  const correct = jest.fn(); await writer.quiz({ onCorrectStroke: correct });
  await drawStroke(data.medians[0]);
  expect(correct).toHaveBeenCalledTimes(1);
});

it("rejects an incorrect stroke and removes input handlers on unmount", async () => {
  const correct = jest.fn(), mistake = jest.fn(); await writer.quiz({ onCorrectStroke: correct, onMistake: mistake });
  pointer("pointerdown", 2, 2); pointer("pointermove", 5, 5); pointer("pointerup", 5, 5);
  await jest.advanceTimersByTimeAsync(600);
  expect(mistake).toHaveBeenCalledTimes(1);
  expect(correct).not.toHaveBeenCalled();
  events.abort();
  await drawStroke(data.medians[0]);
  expect(correct).not.toHaveBeenCalled();
  expect(mistake).toHaveBeenCalledTimes(1);
});
