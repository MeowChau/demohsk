"use client";

import { useEffect, useRef } from "react";
import { celebrateWithin } from "@/lib/celebration";

export function CheckInCelebration({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let stop: (() => void) | undefined;
    // The confirmation dialog opens in an effect; measure its canvas next frame.
    const frame = requestAnimationFrame(() => {
      if (!canvas.current) return;
      void celebrateWithin(canvas.current, {
        particleCount: 28, spread: 75, ticks: 70, startVelocity: 14, gravity: 0.8,
        origin: { x: 0.5, y: 0.9 }, colors: ["#78FFF9", "#0EA599", "#F5A524"],
      }).then(reset => { if (alive) stop = reset; else reset(); });
    });
    return () => { alive = false; cancelAnimationFrame(frame); stop?.(); };
  }, [active]);

  if (!active) return null;
  return <div data-checkin-celebration="" aria-hidden="true" className="pointer-events-none relative mt-3 h-16 w-full overflow-hidden motion-reduce:hidden">
    <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
  </div>;
}
