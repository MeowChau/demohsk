"use client";

import { useId } from "react";
import { ClipboardCheck, Zap } from "lucide-react";
import type { GradingMode } from "@/lib/practice-scoring";

const modes = [
  { value: "on-submit", title: "Chấm khi nộp bài", description: "Làm hết bài, được sửa đáp án. Điểm và đúng/sai hiện sau khi nộp.", Icon: ClipboardCheck },
  { value: "per-question", title: "Chấm ngay từng câu", description: "Biết đúng/sai sau mỗi câu. Đáp án đã chấm sẽ được khóa trong lượt này.", Icon: Zap },
] as const;

export function GradingModeOptions({ value, onChange }: { value: GradingMode; onChange: (mode: GradingMode) => void }) {
  const id = useId();
  return <fieldset className="min-w-0 space-y-3">
    <legend className="mb-3 text-sm font-semibold text-ink">Cách chấm bài</legend>
    {modes.map(({ value: mode, title, description, Icon }) => <label key={mode}
      className={"flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand/40 " +
        (value === mode ? "border-brand bg-brand/5 dark:border-teal" : "border-mist bg-surface hover:border-brand/40")}>
      <input type="radio" name={"grading-mode-" + id} value={mode} checked={value === mode} onChange={() => onChange(mode)}
        className="mt-1 h-4 w-4 shrink-0 accent-brand" />
      <span className="min-w-0"><span className="flex items-center gap-2 font-semibold text-ink"><Icon size={17} aria-hidden="true" />{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate">{description}</span></span>
    </label>)}
    <p className="text-xs leading-5 text-slate">Cuối lượt, bấm Nộp bài để lưu kết quả và lịch sử. Bài nói và luyện nét giữ cách chấm riêng.</p>
  </fieldset>;
}
