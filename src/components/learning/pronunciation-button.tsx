"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";

export function PronunciationButton({ src, disabled = false, onErrorChange }: {
  src: string;
  disabled?: boolean;
  onErrorChange: (message: string) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");

  useEffect(() => {
    const element = audio.current;
    return () => element?.pause();
  }, [src]);

  useEffect(() => {
    if (disabled) {
      audio.current?.pause();
      setState("idle");
    }
  }, [disabled]);

  function reportError() {
    setState("idle");
    onErrorChange("Chưa phát được âm thanh mẫu. Bấm nút loa để thử lại.");
  }

  async function togglePlayback() {
    const element = audio.current;
    if (!element || disabled || state === "loading") return;
    onErrorChange("");
    if (!element.paused) {
      element.pause();
      return;
    }
    element.closest("form")?.querySelectorAll("audio").forEach(other => {
      if (other !== element) other.pause();
    });
    setState("loading");
    try {
      if (element.error) element.load();
      await element.play();
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        setState("idle");
      } else reportError();
    }
  }

  const label = state === "playing" ? "Tạm dừng phát âm mẫu" : state === "loading" ? "Đang tải phát âm mẫu" : "Nghe phát âm mẫu";

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={state === "playing"}
        aria-busy={state === "loading"}
        disabled={disabled}
        onClick={() => { void togglePlayback(); }}
        className={"inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40 " +
          (state === "playing" ? "bg-brand/10 text-brand" : "text-slate enabled:hover:bg-brand/5 enabled:hover:text-brand")}
      >
        {state === "loading" ? <Loader2 size={21} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Volume2 size={21} aria-hidden="true" />}
      </button>
      <audio
        ref={audio}
        src={src}
        preload="none"
        hidden
        onPlaying={() => setState("playing")}
        onWaiting={() => setState("loading")}
        onPause={() => setState("idle")}
        onEnded={() => setState("idle")}
        onError={reportError}
      />
    </>
  );
}
