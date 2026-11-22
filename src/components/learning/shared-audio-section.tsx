"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Headphones } from "lucide-react";
import { pauseOtherPracticeAudio } from "@/lib/practice-audio";

export function SharedAudioSection({ src, label, children, fitToViewport = false }: { src: string; label: string; children: ReactNode; fitToViewport?: boolean }) {
  const section = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      const container = section.current;
      if (height > 0) container?.style.setProperty("--practice-shared-audio-height", height + "px");
      if (!fitToViewport || !container || height <= 0) return;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const style = getComputedStyle(container);
      const toolbarHeight = parseFloat(style.getPropertyValue("--practice-toolbar-height")) || 0;
      const minimumTop = 5.5 * rem + toolbarHeight + rem;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const top = container.getBoundingClientRect().top;
      const contentTop = top >= bottom ? minimumTop : Math.max(top, minimumTop);
      const inset = parseFloat(style.paddingBottom) || 0;
      const available = Math.max(48, Math.floor(bottom - contentTop - height - rem - inset - 0.75 * rem));
      container.style.setProperty("--practice-shared-questions-height", available + "px");
    };
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(element);
    if (fitToViewport) {
      window.addEventListener("resize", schedule);
      window.addEventListener("scroll", schedule, { passive: true });
      window.visualViewport?.addEventListener("resize", schedule);
      window.visualViewport?.addEventListener("scroll", schedule);
    }
    const player = audio.current;
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      player?.pause();
    };
  }, [fitToViewport]);

  return (
    <div ref={section} data-shared-audio-section={fitToViewport ? "" : undefined}
      className="relative flex min-w-0 scroll-mt-[calc(5.5rem+var(--practice-toolbar-height,0px)+1rem)] flex-col gap-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] [--practice-shared-audio-height:7rem]">
      {fitToViewport ? <div data-shared-audio-questions="" role="region" aria-label={"Câu hỏi dùng chung audio: " + label.toLowerCase()} tabIndex={0}
        className="min-h-0 max-h-[var(--practice-shared-questions-height,calc(100dvh-22rem))] overflow-y-auto scroll-py-3 rounded-lg outline-offset-2 [scrollbar-gutter:stable]">
        <div className="flex min-w-0 flex-col gap-5 pb-4 pr-1">{children}</div>
      </div> : children}
      <div ref={dock} data-shared-audio-player=""
        className={"rounded-lg border border-mist bg-surface p-3 shadow-card " + (fitToViewport ? "shrink-0" : "sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-20")}>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 text-brand sm:shrink-0">
            <Headphones size={18} className="shrink-0" aria-hidden="true" />
            <div className="flex flex-wrap items-baseline gap-x-2 sm:flex-col">
              <p className="text-sm font-semibold">Audio dùng chung</p>
              <p className="text-xs text-slate">{label}</p>
            </div>
          </div>
          <audio ref={audio} controls preload="none" src={src} aria-label={"Audio dùng chung cho " + label.toLowerCase()}
            className="block w-full min-w-0 sm:flex-1" onPlay={event => pauseOtherPracticeAudio(event.currentTarget)} />
        </div>
      </div>
    </div>
  );
}
