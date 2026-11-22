"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Headphones } from "lucide-react";
import { pauseOtherPracticeAudio } from "@/lib/practice-audio";

export interface AttemptAudioTrack {
  id: string;
  src: string;
  label: string;
  questionIds: string[];
}

export function AttemptAudioDock({ tracks, activeQuestionId, formRef }: {
  tracks: AttemptAudioTrack[];
  activeQuestionId: string | null;
  formRef: RefObject<HTMLFormElement | null>;
}) {
  const dock = useRef<HTMLDivElement>(null);
  const [lastTrackId, setLastTrackId] = useState(tracks[0]?.id);
  const activeTrack = tracks.find(track => activeQuestionId && track.questionIds.includes(activeQuestionId))
    || tracks.find(track => track.id === lastTrackId) || tracks[0];

  useEffect(() => {
    if (activeTrack) setLastTrackId(activeTrack.id);
  }, [activeTrack]);

  useEffect(() => {
    const element = dock.current;
    const form = formRef.current;
    if (!element || !form) return;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      if (height > 0) form.style.setProperty("--practice-audio-dock-height", height + "px");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      form.style.removeProperty("--practice-audio-dock-height");
    };
  }, [formRef]);

  if (!activeTrack) return null;
  return (
    <div ref={dock} data-attempt-audio-dock=""
      className="sticky top-[calc(5.5rem+var(--practice-toolbar-height,4.5rem)+1rem)] z-20 min-w-0 bg-paper before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-paper after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-paper lg:static lg:before:hidden lg:after:hidden">
      <div className="rounded-lg border border-mist bg-surface p-2.5 shadow-card lg:p-3">
        {tracks.map(track => <TrackPlayer key={track.id} track={track} active={track.id === activeTrack.id} />)}
      </div>
    </div>
  );
}

function TrackPlayer({ track, active }: { track: AttemptAudioTrack; active: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!active) audio.current?.pause();
  }, [active]);
  useEffect(() => {
    const player = audio.current;
    return () => player?.pause();
  }, []);
  return (
    <div hidden={!active} data-shared-audio-player=""
      className={active ? "flex min-w-0 items-center gap-2 lg:flex-col lg:items-stretch lg:gap-3" : "hidden"}>
      <div className="flex shrink-0 items-center gap-2 text-brand lg:justify-between">
        <span className="flex items-center gap-2">
          <Headphones size={18} className="hidden shrink-0 lg:block" aria-hidden="true" />
          <span className="sr-only text-sm font-semibold lg:not-sr-only">Audio dùng chung</span>
        </span>
        <span className="whitespace-nowrap rounded-md bg-brand/5 px-2 py-1 text-xs font-semibold">{track.label}</span>
      </div>
      <audio ref={audio} controls preload="none" src={track.src} aria-label={"Audio dùng chung cho " + track.label.toLowerCase()}
        className="block h-10 w-full min-w-0" onPlay={event => pauseOtherPracticeAudio(event.currentTarget)} />
    </div>
  );
}
