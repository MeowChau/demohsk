"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Headphones } from "lucide-react";
import { pauseOtherPracticeAudio } from "@/lib/practice-audio";

export function SharedAudioSection({ src, label, children }: { src: string; label: string; children: ReactNode }) {
  const section = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const element = dock.current;
    if (!element) return;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) section.current?.style.setProperty("--practice-shared-audio-height", height + "px");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    const player = audio.current;
    return () => { observer?.disconnect(); player?.pause(); };
  }, []);

  return (
    <div ref={section} className="relative flex min-w-0 flex-col gap-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] [--practice-shared-audio-height:7rem]">
      {children}
      <div ref={dock}
        className="sticky bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-20 rounded-lg border border-mist bg-surface p-3 shadow-card">
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
