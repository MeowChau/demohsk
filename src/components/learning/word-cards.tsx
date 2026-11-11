"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, RotateCcw, Brain, PenLine } from "lucide-react";
import { apiAction } from "@/lib/api/client";
import type { HskWord } from "@/lib/api/types";
import { HskBadge } from "@/components/ui/catalog-badge";
import { WordDeck } from "./word-deck";
import { handwritingHref } from "@/lib/hanzi-data";

export function WordCards({ words, view = "cards", lessonTitle }: { words: HskWord[]; view?: "cards" | "list"; lessonTitle?: string }) {
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  async function rate(id: number, action: "studied" | "remembered" | "unknown") {
    setBusy(id); setError("");
    try { await apiAction("analytics/vocabulary-progress", { vocabularyId: id, action }); setRatings(previous => ({ ...previous, [id]: action })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa lưu được tiến độ học từ."); }
    finally { setBusy(null); }
  }
  return <div className="flex flex-col gap-4">{error && <p className="hsk-error" role="alert">{error}</p>}{view === "cards" ? <WordDeck words={words} lessonTitle={lessonTitle} ratings={ratings} busy={busy} onRate={(id, action) => { void rate(id, action); }} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{words.map(word => <article key={word.id} className="hsk-panel flex flex-col gap-4">
    <div className="flex items-start justify-between gap-2"><div><h2 lang="zh-CN" className="hsk-hanzi text-ink">{word.hanzi}</h2><p className="mt-1 text-base text-brand">{word.pinyin}</p></div><HskBadge level={word.hskLevel} /></div>
    <p className="text-sm leading-6 text-slate">{word.meaning}</p>
    {word.topic && <p className="text-xs text-slate-soft">Chủ đề: {word.topic}</p>}
    <Link href={handwritingHref(word)} className="hsk-button-secondary w-fit"><PenLine size={16} />Luyện viết</Link>
    <div className="mt-auto flex flex-wrap gap-2 border-t border-mist pt-4">{([
      ["studied", "Đã học", Check], ["remembered", "Đã nhớ", Brain], ["unknown", "Cần ôn", RotateCcw],
    ] as const).map(([action, label, Icon]) => <button type="button" key={action} disabled={busy !== null} aria-pressed={ratings[word.id] === action} onClick={() => rate(word.id, action)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition disabled:opacity-50 ${ratings[word.id] === action ? "border-brand bg-brand/10 text-brand" : "border-mist text-slate hover:border-brand hover:text-brand"}`}><Icon size={14} />{busy === word.id ? "Đang lưu…" : label}</button>)}</div>
  </article>)}</div>}</div>;
}
