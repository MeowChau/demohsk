import type { Options } from "canvas-confetti";

// Decorative code is shared but downloaded only when a celebration is needed.
// A missing optional chunk must never block navigation or saving progress.
export async function celebrate(options: Options): Promise<void> {
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    void confetti({ ...options, disableForReducedMotion: true });
  } catch {
    // The study action remains successful if its decorative effect cannot load.
  }
}

// The achievement owns its canvas so particles cannot cover the dashboard.
export async function celebrateWithin(canvas: HTMLCanvasElement, options: Options): Promise<() => void> {
  const noop = () => {};
  if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !canvas.isConnected) return noop;
  try {
    const { default: confetti } = await import("canvas-confetti");
    if (!canvas.isConnected) return noop;
    const effect = confetti.create(canvas, { resize: true, disableForReducedMotion: true });
    void effect({ ...options, disableForReducedMotion: true });
    return () => effect.reset();
  } catch {
    return noop;
  }
}
