"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Field } from "@/components/ui/field";
import { examAttemptHref } from "@/lib/attempt-routes";
import { defaultExamMinutes, parseExamMinutes } from "@/lib/exam-timing";

export function StartExamButton({ examId, level, title }: { examId: string; level: number; title: string }) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(String(defaultExamMinutes(level)));
  const [error, setError] = useState("");
  function start() {
    const duration = parseExamMinutes(minutes.trim());
    if (duration === null) {
      setError("Vui lòng nhập thời gian từ 1 đến 180 phút.");
      return;
    }
    setOpen(false);
    router.push(examAttemptHref(examId) + "?duration=" + duration);
  }
  return <>
    <div className="flex flex-wrap items-center gap-4">
      <button type="button" className="hsk-button w-fit" onClick={() => { setError(""); setOpen(true); }}>Bắt đầu làm bài</button>
      <span className="inline-flex items-center gap-2 text-sm text-slate"><Clock3 size={17} aria-hidden="true" />{defaultExamMinutes(level)} phút mặc định</span>
    </div>
    <ConfirmationDialog open={open} title="Thời gian làm bài" confirmLabel="Bắt đầu làm bài" cancelLabel="Huỷ"
      icon={<Clock3 size={20} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />}
      onCancel={() => setOpen(false)} onConfirm={start}>
      <div className="flex flex-col gap-4">
        <p className="font-medium text-ink">{title}</p>
        <Field id={id} label="Thời gian (phút)" inputMode="numeric" maxLength={3} value={minutes}
          onChange={event => { setMinutes(event.target.value); setError(""); }} error={error} hint="Từ 1 đến 180 phút"
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); start(); } }} />
        <p>Đồng hồ bắt đầu khi mở bài thi. Hết thời gian, hệ thống tự nộp câu trả lời của bạn.</p>
      </div>
    </ConfirmationDialog>
  </>;
}
