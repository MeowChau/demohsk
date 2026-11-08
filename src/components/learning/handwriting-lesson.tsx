"use client";

import { useState } from "react";
import type { HskWord } from "@/lib/api/types";
import { HskBadge } from "@/components/ui/catalog-badge";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";
import { HanziPractice } from "./hanzi-practice";

export function HandwritingLesson({ words, initialWordId }: { words: HskWord[]; initialWordId?: string }) {
  const [selected, setSelected] = useState(() => Math.max(0, words.findIndex(word => String(word.id) === initialWordId)));
  const [engaged, setEngaged] = useState(false);
  const word = words[selected];
  if (!word) return null;
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]">
    {engaged && <StudyTracker module={STUDY_MODULES.Writing} />}
    <aside className="hsk-panel flex flex-col gap-4"><h2 className="hsk-section-title">Chọn từ để luyện viết</h2><div className="grid max-h-[560px] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-1">{words.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index} onClick={() => setSelected(index)} className={`rounded-lg border p-3 text-left transition ${selected === index ? "border-brand bg-brand/5" : "border-mist hover:border-brand"}`}><span className="block text-xl leading-8 text-ink" lang="zh-CN">{item.hanzi}</span><span className="block text-xs leading-5 text-slate">{item.pinyin}</span></button>)}</div></aside>
    <section className="hsk-panel flex min-w-0 flex-col gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-3xl font-medium leading-relaxed text-ink" lang="zh-CN">{word.hanzi}</h2><p className="mt-1 text-base leading-7 text-brand">{word.pinyin}</p><p className="mt-2 text-sm leading-6 text-slate">{word.meaning}</p></div><HskBadge level={word.hskLevel} /></div><p className="text-sm leading-6 text-slate">Dùng chuột, bút cảm ứng hoặc ngón tay viết từng nét trong ô. Bấm “Xem mẫu” để xem thứ tự nét rồi viết theo.</p><HanziPractice key={word.id} text={word.hanzi} onInteraction={() => setEngaged(true)} /></section>
  </div>;
}
