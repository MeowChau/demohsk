"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { HskWord } from "@/lib/api/types";
import { HskBadge } from "@/components/ui/catalog-badge";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";
import { HanziPractice } from "./hanzi-practice";

export function HandwritingLesson({ words, initialWordId }: { words: HskWord[]; initialWordId?: string }) {
  const [selected, setSelected] = useState(() => Math.max(0, words.findIndex(word => String(word.id) === initialWordId)));
  const [engaged, setEngaged] = useState(false);
  const [completedWords, setCompletedWords] = useState<Record<number, boolean>>({});
  const word = words[selected];
  if (!word) return null;
  const completedCount = words.filter(item => completedWords[item.id]).length;
  const allComplete = completedCount === words.length;
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]">
    {engaged && <StudyTracker module={STUDY_MODULES.Writing} />}
    <aside className="hsk-panel flex min-w-0 flex-col gap-4">
      <h2 className="hsk-section-title">Chọn từ để luyện viết</h2>
      <div>
        <p className="text-sm font-medium text-brand">Đã luyện viết {completedCount}/{words.length} từ</p>
        <div role="progressbar" aria-label="Tiến độ luyện viết" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={completedCount}
          className="mt-2 h-2 overflow-hidden rounded-full bg-brand/10">
          <div className="h-full rounded-full bg-brand" style={{ width: `${completedCount / words.length * 100}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-soft">Tiến độ trong lượt luyện này. Viết đủ các chữ để hoàn thành một từ.</p>
      </div>
      <div className="grid max-h-[560px] grid-cols-2 gap-2 overflow-y-auto pr-1 lg:grid-cols-1">{words.map((item, index) => <button type="button" key={item.id}
        aria-label={`Luyện viết từ ${item.hanzi}${completedWords[item.id] ? ", đã hoàn thành" : ""}`} aria-pressed={selected === index} onClick={() => setSelected(index)}
        className={`min-w-0 rounded-lg border p-3 text-left transition ${selected === index ? "border-brand bg-brand/5" : "border-mist hover:border-brand"}`}>
        <span className="flex items-start justify-between gap-2"><span className="text-xl leading-8 text-ink" lang="zh-CN">{item.hanzi}</span>{completedWords[item.id] && <Check size={17} aria-hidden="true" className="mt-1 shrink-0 text-brand" />}</span>
        <span className="block text-xs leading-5 text-slate">{item.pinyin}</span>
      </button>)}</div>
    </aside>
    <section className="hsk-panel flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-2 text-xs font-medium text-slate">Từ {selected + 1} / {words.length}</p><h2 className="text-3xl font-medium leading-relaxed text-ink" lang="zh-CN">{word.hanzi}</h2><p className="mt-1 text-base leading-7 text-brand">{word.pinyin}</p><p className="mt-2 text-sm leading-6 text-slate">{word.meaning}</p></div><HskBadge level={word.hskLevel} /></div>
      <p className="text-sm leading-6 text-slate">Dùng chuột, bút cảm ứng hoặc ngón tay viết từng nét trong ô. Bấm “Xem mẫu” để xem thứ tự nét rồi viết theo.</p>
      <HanziPractice key={word.id} text={word.hanzi} onInteraction={() => setEngaged(true)} onProgress={progress => {
        if (progress.totalCharacters > 0 && new Set(progress.completedPositions).size >= progress.totalCharacters) {
          setCompletedWords(previous => previous[word.id] ? previous : { ...previous, [word.id]: true });
        }
      }} />
      {allComplete && <p role="status" className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm font-medium text-brand"><Check size={18} aria-hidden="true" className="mt-0.5 shrink-0" />Đã luyện viết đủ {words.length}/{words.length} từ. Bạn có thể chọn lại từ để luyện thêm.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4">
        <button type="button" className="hsk-button-secondary" disabled={selected === 0} onClick={() => setSelected(index => index - 1)}><ChevronLeft size={16} aria-hidden="true" />Từ trước</button>
        <button type="button" className="hsk-button" disabled={selected === words.length - 1} onClick={() => setSelected(index => index + 1)}>Từ tiếp theo<ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </section>
  </div>;
}
