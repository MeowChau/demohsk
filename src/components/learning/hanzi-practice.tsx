"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Lightbulb, Check } from "lucide-react";
import type HanziWriter from "hanzi-writer";
import { hanziCharacters, loadHanziData } from "@/lib/hanzi-data";
import { hanziRenderTarget } from "@/lib/hanzi-render-target";
import { sameHandwritingStrokes, type HandwritingProgress, type HandwritingStrokeProgress } from "@/lib/writing-practice";

type BoardState = { status: "loading" | "practice" | "preview" | "complete" | "error"; total: number; correct: number; mistakes: number; message: string };
const initialState: BoardState = { status: "loading", total: 0, correct: 0, mistakes: 0, message: "Đang tải nét chữ…" };

function CharacterBoard({ character, onComplete, onInteraction, onStrokeProgress }: { character: string; onComplete: () => void; onInteraction?: () => void; onStrokeProgress?: (progress: HandwritingStrokeProgress) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const activeCharacter = useRef(character);
  activeCharacter.current = character;
  const callbacks = useRef({ onComplete, onInteraction, onStrokeProgress });
  callbacks.current = { onComplete, onInteraction, onStrokeProgress };
  const [state, setState] = useState<BoardState>(initialState);
  const [retry, setRetry] = useState(0);
  const [outline, setOutline] = useState(true);
  const outlineRef = useRef(true);

  const lastReportedStrokes = useRef<HandwritingStrokeProgress | null>(null);
  useEffect(() => {
    const progress = { correctStrokes: state.correct, totalStrokes: state.total, mistakes: state.mistakes };
    if (sameHandwritingStrokes(lastReportedStrokes.current, progress)) return;
    lastReportedStrokes.current = progress;
    callbacks.current.onStrokeProgress?.(progress);
  }, [state.correct, state.total, state.mistakes]);

  const startQuiz = useCallback(async (instance: HanziWriter, expectedCharacter: string) => {
    const active = () => writer.current === instance && activeCharacter.current === expectedCharacter;
    if (!active()) return;
    setState(previous => ({ ...previous, status: "practice", correct: 0, mistakes: 0, message: "Viết theo từng nét của chữ mẫu." }));
    await instance.quiz({
      onCorrectStroke: data => {
        if (active()) setState(previous => ({ ...previous, correct: previous.total - data.strokesRemaining, mistakes: data.totalMistakes, message: "Đúng nét rồi, tiếp tục nhé." }));
      },
      onMistake: data => {
        if (active()) setState(previous => ({ ...previous, mistakes: data.totalMistakes, message: "Nét chưa khớp. Thử lại theo chữ mẫu." }));
      },
      onComplete: summary => {
        if (!active()) return;
        setState(previous => ({ ...previous, status: "complete", correct: previous.total, mistakes: summary.totalMistakes, message: `Đã hoàn thành chữ ${summary.character}.` }));
        callbacks.current.onComplete();
      },
    });
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let active = true;
    let instance: HanziWriter | null = null;
    let observer: ResizeObserver | undefined;
    const events = new AbortController();
    setState(initialState);
    async function initialize() {
      try {
        const [{ default: Writer }, data] = await Promise.all([import("hanzi-writer"), loadHanziData(character)]);
        if (!active || !element) return;
        const size = Math.max(100, Math.floor(element.clientWidth) || 320);
        instance = new Writer(element, {
          width: size, height: size, padding: 22,
          rendererOverride: { createRenderTarget: hanziRenderTarget(events.signal) },
          charDataLoader: () => data,
          showCharacter: false, showOutline: outlineRef.current,
          strokeColor: "#163d69", drawingColor: "#163d69", outlineColor: "#a1a7af",
          highlightColor: "#0d9f95", highlightCompleteColor: "#0d9f95",
          drawingWidth: 7, strokeAnimationSpeed: 1, delayBetweenStrokes: 280,
          showHintAfterMisses: 2, leniency: 1.15, acceptBackwardsStrokes: false,
        });
        writer.current = instance;
        await instance.setCharacter(character);
        if (!active) return;
        setState(previous => ({ ...previous, total: data.strokes.length }));
        await startQuiz(instance, character);
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => {
            if (!active || !instance || !element.clientWidth) return;
            const width = Math.floor(element.clientWidth);
            instance.updateDimensions({ width, height: width, padding: 22 });
          });
          observer.observe(element);
        }
      } catch (cause) {
        if (active) setState(previous => ({ ...previous, status: "error", message: cause instanceof Error ? cause.message : "Chưa mở được ô luyện viết. Hãy thử lại." }));
      }
    }
    void initialize();
    return () => {
      active = false; observer?.disconnect(); events.abort();
      instance?.cancelQuiz();
      if (instance) void instance.pauseAnimation().catch(() => {});
      if (writer.current === instance) writer.current = null;
      element.replaceChildren();
    };
  }, [character, retry, startQuiz]);

  async function preview() {
    const instance = writer.current;
    if (!instance) return;
    callbacks.current.onInteraction?.();
    setState(previous => ({ ...previous, status: "preview", message: "Quan sát thứ tự và hướng của từng nét." }));
    try {
      await instance.animateCharacter();
      await startQuiz(instance, character);
    } catch { if (writer.current === instance) setState(previous => ({ ...previous, status: "error", message: "Chưa xem được mẫu. Hãy thử lại." })); }
  }

  const disabled = state.status === "loading" || state.status === "preview" || state.status === "error";
  return <div className="flex flex-col gap-4">
    <div className="relative mx-auto aspect-square w-full max-w-[344px] overflow-hidden rounded-xl border border-mist bg-[#faf9f5]" role="group" aria-label={`Ô luyện viết chữ ${character}`} onPointerDownCapture={() => callbacks.current.onInteraction?.()}>
      <svg viewBox="0 0 344 344" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><path d="M0 0L344 344M344 0L0 344" fill="none" stroke="#dfe3e6" strokeWidth="0.7" /><path d="M172 0V344M0 172H344" fill="none" stroke="#e7e9eb" strokeWidth="0.6" strokeDasharray="4 5" /></svg>
      <div ref={host} className="absolute inset-0 touch-none select-none" aria-hidden="true" />
      {(state.status === "loading" || state.status === "error") && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#faf9f5]/95 px-6 text-center"><p className="text-sm leading-6 text-slate" role={state.status === "error" ? "alert" : "status"}>{state.message}</p>{state.status === "error" && <button type="button" className="hsk-button-secondary" onClick={() => setRetry(previous => previous + 1)}>Thử lại</button>}</div>}
    </div>
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className="hsk-button-secondary" disabled={disabled} onClick={() => { void preview(); }}><Play size={16} />Xem mẫu</button>
      <button type="button" className="hsk-button-secondary" disabled={disabled} onClick={() => { const instance = writer.current; if (instance) { callbacks.current.onInteraction?.(); void startQuiz(instance, character); } }}><RotateCcw size={16} />Viết lại</button>
      <button type="button" className="hsk-button-secondary" disabled={disabled || state.status === "complete"} onClick={() => { const instance = writer.current; if (instance) { callbacks.current.onInteraction?.(); void instance.highlightStroke(state.correct); } }}><Lightbulb size={16} />Gợi ý nét</button>
    </div>
    <label className="flex items-center justify-center gap-2 text-sm text-slate"><input type="checkbox" className="h-4 w-4 accent-teal" checked={outline} disabled={disabled} onChange={event => { const visible = event.target.checked; setOutline(visible); outlineRef.current = visible; const instance = writer.current; if (instance) void (visible ? instance.showOutline() : instance.hideOutline()); }} />Hiện chữ mẫu mờ</label>
    <div className="text-center" aria-live="polite"><p className={`text-sm leading-6 ${state.status === "complete" ? "font-medium text-brand" : "text-slate"}`}>{state.message}</p>{state.total > 0 && <p className="mt-1 text-xs leading-5 text-slate-soft">{state.correct}/{state.total} nét · {state.mistakes} lần thử chưa khớp</p>}</div>
  </div>;
}

function WordPractice({ text, onInteraction, onProgress, onStrokeProgress }: { text: string; onInteraction?: () => void; onProgress?: (progress: HandwritingProgress) => void; onStrokeProgress?: (progress: HandwritingStrokeProgress) => void }) {
  const characters = hanziCharacters(text);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [strokeProgress, setStrokeProgress] = useState<Record<number, HandwritingStrokeProgress>>({});
  const progressCallback = useRef(onProgress);
  progressCallback.current = onProgress;
  const strokeProgressCallback = useRef(onStrokeProgress);
  strokeProgressCallback.current = onStrokeProgress;
  useEffect(() => {
    progressCallback.current?.({ text, completedPositions: completed, totalCharacters: characters.length });
  }, [text, completed, characters.length]);
  const strokeValues = Object.values(strokeProgress);
  const correctStrokes = strokeValues.reduce((sum, item) => sum + item.correctStrokes, 0);
  const totalStrokes = strokeValues.reduce((sum, item) => sum + item.totalStrokes, 0);
  const mistakes = strokeValues.reduce((sum, item) => sum + item.mistakes, 0);
  const lastReportedStrokes = useRef<HandwritingStrokeProgress | null>(null);
  useEffect(() => {
    const progress = { correctStrokes, totalStrokes, mistakes };
    if (sameHandwritingStrokes(lastReportedStrokes.current, progress)) return;
    lastReportedStrokes.current = progress;
    strokeProgressCallback.current?.(progress);
  }, [correctStrokes, totalStrokes, mistakes]);
  const character = characters[index];
  if (!character) return <p className="hsk-notice">Từ này chưa có chữ Hán để luyện viết. Hãy chọn một từ khác.</p>;
  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap justify-center gap-2" aria-label="Chọn chữ trong từ">{characters.map((item, position) => <button type="button" key={position} onClick={() => setIndex(position)} aria-pressed={index === position} aria-label={`Viết chữ ${item}, vị trí ${position + 1}`} className={`relative flex h-12 min-w-12 items-center justify-center rounded-lg border px-3 text-2xl transition ${index === position ? "border-brand bg-brand/10 text-brand" : "border-mist text-ink hover:border-brand"}`} lang="zh-CN">{item}{completed.includes(position) && <Check className="absolute -right-1 -top-1 rounded-full bg-surface text-brand" size={14} />}</button>)}</div>
    <CharacterBoard key={index} character={character} onInteraction={onInteraction} onStrokeProgress={progress => setStrokeProgress(previous => sameHandwritingStrokes(previous[index], progress) ? previous : { ...previous, [index]: progress })} onComplete={() => setCompleted(previous => previous.includes(index) ? previous : [...previous, index])} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4"><span className="text-xs text-slate">Đã viết {completed.length}/{characters.length} chữ trong từ này</span><button type="button" className="hsk-button" disabled={index === characters.length - 1} onClick={() => setIndex(previous => previous + 1)}>Chữ tiếp theo</button></div>
  </div>;
}

export function HanziPractice(props: { text: string; onInteraction?: () => void; onProgress?: (progress: HandwritingProgress) => void; onStrokeProgress?: (progress: HandwritingStrokeProgress) => void }) {
  return <WordPractice key={props.text} {...props} />;
}
