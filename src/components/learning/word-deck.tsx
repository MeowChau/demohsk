"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check, Brain, RotateCcw, PenLine } from "lucide-react";
import type { HskWord } from "@/lib/api/types";
import { HskBadge } from "@/components/ui/catalog-badge";
import { handwritingHref } from "@/lib/hanzi-data";
type Rating = "studied" | "remembered" | "unknown";
export function WordDeck({ words, ratings, busy, onRate }: { words: HskWord[]; ratings: Record<number, string>; busy: number | null; onRate: (id: number, action: Rating) => void }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const word = words[Math.min(index, words.length - 1)];
  if (!word) return null;
  const move = (delta: number) => { setIndex(previous => Math.max(0, Math.min(words.length - 1, previous + delta))); setFlipped(false); };
  return <div className="hsk-panel mx-auto flex w-full max-w-2xl flex-col gap-5"><div className="flex items-center justify-between gap-3"><HskBadge level={word.hskLevel} /><span className="text-xs text-slate">Thẻ {index + 1} / {words.length} trong trang</span></div><button type="button" onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Xem lại chữ Hán" : "Lật thẻ để xem nghĩa"} aria-pressed={flipped} className="flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-xl border border-mist bg-brand/5 p-6 text-center transition hover:border-brand">{flipped ? <p className="text-base leading-8 text-ink">{word.meaning}</p> : <><p className="hsk-hanzi text-ink" lang="zh-CN">{word.hanzi}</p><p className="text-lg text-brand">{word.pinyin}</p></>}<span className="text-xs text-slate-soft">{flipped ? "Bấm để xem chữ Hán" : "Bấm để xem nghĩa"}</span></button><Link href={handwritingHref(word)} className="hsk-button-secondary self-center"><PenLine size={16} />Luyện viết chữ này</Link><div className="flex flex-wrap justify-center gap-2">{([["studied", "Đã học", Check], ["remembered", "Đã nhớ", Brain], ["unknown", "Cần ôn", RotateCcw]] as const).map(([action, label, Icon]) => <button key={action} type="button" disabled={busy !== null} aria-pressed={ratings[word.id] === action} onClick={() => onRate(word.id, action)} className={ratings[word.id] === action ? "hsk-button" : "hsk-button-secondary"}><Icon size={16} />{busy === word.id ? "Đang lưu…" : label}</button>)}</div><div className="flex items-center justify-between gap-3"><button type="button" className="hsk-button-secondary" disabled={index === 0} onClick={() => move(-1)}><ChevronLeft size={16} />Từ trước</button><button type="button" className="hsk-button-secondary" disabled={index >= words.length - 1} onClick={() => move(1)}>Từ tiếp theo<ChevronRight size={16} /></button></div></div>;
}
