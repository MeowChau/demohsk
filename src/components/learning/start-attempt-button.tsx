"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock3 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Field } from "@/components/ui/field";
import { attemptHref } from "@/lib/attempt-routes";
import { defaultExamMinutes, parseExamMinutes } from "@/lib/exam-timing";
import type { GradingMode } from "@/lib/practice-scoring";
import { GradingModeOptions } from "./attempt/grading-mode-options";

function StartAttemptButton({ reference, level = 1, title }: { reference: string; level?: number; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();
  const isExam = reference.startsWith("exam-");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<GradingMode>("on-submit");
  const [minutes, setMinutes] = useState(String(defaultExamMinutes(level)));
  const [error, setError] = useState("");
  function start() {
    if (pending) return;
    const duration = isExam ? parseExamMinutes(minutes.trim()) : null;
    if (isExam && duration === null) {
      setError("Thời gian phải là số nguyên từ 1 đến 180 phút.");
      return;
    }
    const query = new URLSearchParams({ grading: mode });
    if (duration !== null) query.set("duration", String(duration));
    setOpen(false);
    startTransition(() => router.push(attemptHref(reference) + "?" + query));
  }
  return <>
    <div className="flex flex-wrap items-center gap-4">
      {isExam ? <button type="button" className="hsk-button w-fit" aria-haspopup="dialog" aria-expanded={open} disabled={pending} aria-busy={pending}
        onClick={() => { setError(""); setOpen(true); }}>{pending ? "Đang tải bài thi…" : "Bắt đầu làm bài"}</button>
        : <Link href={attemptHref(reference)} className="hsk-button w-fit" aria-haspopup="dialog" aria-expanded={open} aria-disabled={pending} aria-busy={pending}
          onClick={event => {
            if (pending) { event.preventDefault(); return; }
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); setError(""); setOpen(true);
          }}>{pending ? "Đang tải bài luyện…" : <>Mở bài luyện<ArrowRight size={16} aria-hidden="true" /></>}</Link>}
      {isExam && <span className="inline-flex items-center gap-2 text-sm text-slate"><Clock3 size={17} aria-hidden="true" />{defaultExamMinutes(level)} phút mặc định</span>}
    </div>
    <ConfirmationDialog open={open} title="Chọn cách làm bài" confirmLabel="Bắt đầu làm bài" cancelLabel="Huỷ"
      confirmDisabled={pending} cancelDisabled={pending}
      icon={<ClipboardCheck size={20} className="mt-0.5 shrink-0 text-brand dark:text-ink" aria-hidden="true" />}
      onCancel={() => { if (!pending) setOpen(false); }} onConfirm={start}>
      <div className="flex min-w-0 flex-col gap-4">
        <p className="font-medium text-ink">{title}</p>
        <GradingModeOptions value={mode} onChange={setMode} />
        {isExam && <>
          <Field id={id} label="Thời gian (phút)" inputMode="numeric" maxLength={3} value={minutes}
            onChange={event => { setMinutes(event.target.value); setError(""); }} error={error} hint="Nhập số nguyên từ 1 đến 180 phút"
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); start(); } }} />
          <p className="text-xs leading-5">Đồng hồ bắt đầu khi mở bài thi. Hết thời gian, hệ thống tự nộp câu trả lời của bạn.</p>
        </>}
      </div>
    </ConfirmationDialog>
  </>;
}

export function StartExamButton({ examId, level, title }: { examId: string; level: number; title: string }) {
  return <StartAttemptButton reference={"exam-" + examId} level={level} title={title} />;
}

export function StartPracticeButton({ setId, title }: { setId: number; title: string }) {
  return <StartAttemptButton reference={"set-" + setId} title={title} />;
}
