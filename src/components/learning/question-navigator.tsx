"use client";

import { useEffect, useRef } from "react";
import { Flag, X } from "lucide-react";

export type QuestionNavigationStatus = "unanswered" | "answered" | "correct" | "incorrect";
export interface QuestionNavigationItem {
  id: string;
  number: number;
  status: QuestionNavigationStatus;
  bookmarked: boolean;
}
export interface QuestionNavigationGroup {
  skill: string;
  title: string;
  items: QuestionNavigationItem[];
}

export function QuestionNavigator({ groups, activeId, answeredCount, totalCount, markedCount, reviewMode, open, onOpenChange, onSelect }: {
  groups: QuestionNavigationGroup[];
  activeId: string | null;
  answeredCount: number;
  totalCount: number;
  markedCount: number;
  reviewMode: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeCallback = useRef(onOpenChange);
  closeCallback.current = onOpenChange;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      if (!element.open) element.showModal();
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = overflow;
        if (element.open) element.close();
      };
    }
    if (element.open) element.close();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia?.("(min-width: 1024px)");
    if (!desktop) return;
    const closeOnDesktop = () => { if (desktop.matches) closeCallback.current(false); };
    desktop.addEventListener?.("change", closeOnDesktop);
    return () => desktop.removeEventListener?.("change", closeOnDesktop);
  }, []);

  function selectQuestion(id: string) {
    if (dialog.current?.open) dialog.current.close();
    onOpenChange(false);
    onSelect(id);
  }

  function panel(mobile: boolean) {
    return (
      <div className={"flex min-h-0 flex-col " + (mobile ? "max-h-[calc(100dvh-3rem)]" : "max-h-[calc(100dvh-6.5rem-var(--practice-toolbar-height,4.5rem)-var(--practice-audio-offset,0px)-1rem)]")}>
        <div className="border-b border-mist p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink" id={mobile ? "practice-question-menu-title" : undefined}>Danh sách câu hỏi</h2>
            {mobile && <button type="button" aria-label="Đóng danh sách câu hỏi" title="Đóng danh sách câu hỏi"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate hover:bg-paper hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => onOpenChange(false)}><X size={20} aria-hidden="true" /></button>}
          </div>

        </div>
        <nav aria-label={mobile ? "Chọn câu hỏi trên điện thoại" : "Chọn câu hỏi"} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {groups.map(group => (
            <div key={group.skill}>
              <h3 className={groups.length > 1 ? "mb-3 text-sm font-semibold text-brand" : "sr-only"}>{group.title}</h3>
              <div className="grid grid-cols-5 gap-2">
                {group.items.map(item => {
                  const current = item.id === activeId;
                  const statusLabel = item.status === "correct" ? "đúng" : item.status === "incorrect" ? "sai"
                    : item.status === "answered" ? "đã làm" : "chưa làm";
                  const style = item.status === "correct" ? "border-success bg-success-soft text-success"
                    : item.status === "incorrect" ? "border-danger bg-danger-soft text-danger"
                      : item.status === "answered" ? "border-brand bg-brand text-white"
                        : "border-mist bg-surface text-slate";
                  const label = "Câu " + item.number + ", " + statusLabel + (item.bookmarked ? ", đã đánh dấu" : "") + (current ? ", đang xem" : "");
                  return (
                    <button key={item.id} type="button" aria-label={label} title={label} aria-current={current ? "step" : undefined}
                      onClick={() => selectQuestion(item.id)}
                      className={"relative flex h-11 min-w-0 items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " + style +
                        (current ? " ring-2 ring-brand ring-offset-1 ring-offset-surface" : "")}>
                      {String(item.number).padStart(2, "0")}
                      {item.bookmarked && <Flag size={11} fill="currentColor" className="absolute right-1 top-1 text-warning" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!totalCount && <p className="text-sm text-slate">Bài luyện chưa có câu hỏi.</p>}
        </nav>
        <div className="border-t border-mist p-4 text-xs text-slate">
          <p className="mb-3 leading-5">Đã làm {answeredCount}/{totalCount} câu · {markedCount} câu đánh dấu</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-brand dark:bg-[var(--brand-text)]" aria-hidden="true" />Đã làm</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-2 border-slate bg-paper" aria-hidden="true" />Chưa làm</span>
            <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border-2 border-brand" aria-hidden="true" />Đang xem</span>
            <span className="flex items-center gap-2"><Flag size={13} className="text-warning" fill="currentColor" aria-hidden="true" />Đánh dấu</span>
            {reviewMode && <>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-success dark:bg-[var(--success-text)]" aria-hidden="true" />Đúng</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-danger dark:bg-[var(--danger-text)]" aria-hidden="true" />Sai</span>
            </>}
          </div>
          <p className="mt-3 leading-5">Bấm số để đến câu. Bấm biểu tượng cờ trên câu hỏi để xem lại sau.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside aria-label="Bảng câu hỏi" className="hidden max-h-[calc(100dvh-6.5rem-var(--practice-toolbar-height,4.5rem)-var(--practice-audio-offset,0px)-1rem)] min-h-0 overflow-hidden rounded-lg border border-mist bg-surface lg:flex lg:flex-col">
        {panel(false)}
      </aside>
      <dialog ref={dialog} id="practice-question-menu" aria-labelledby="practice-question-menu-title"
        className="max-h-[calc(100dvh-3rem)] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-lg border border-mist bg-surface p-0 text-ink backdrop:bg-navy-deep/50"
        onCancel={() => onOpenChange(false)} onClose={() => onOpenChange(false)}
        onClick={event => { if (event.target === event.currentTarget) onOpenChange(false); }}>
        {panel(true)}
      </dialog>
    </>
  );
}
