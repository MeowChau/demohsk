"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";

export function ConfirmationDialog({ open, title, children, confirmLabel, cancelLabel = "Tiếp tục làm bài",
  onCancel, onConfirm, confirmDisabled = false }: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!mounted || !element || !open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    if (!element.open) element.showModal();
    document.body.style.overflow = "hidden";
    cancel.current?.focus({ preventScroll: true });
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mounted, open]);

  if (!mounted) return null;
  return createPortal(
    <dialog ref={dialog} aria-labelledby={id + "-title"} aria-describedby={id + "-description"}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-mist bg-surface p-0 text-ink shadow-float backdrop:bg-navy-deep/50"
      onCancel={event => { event.preventDefault(); onCancel(); }}
      onClick={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <h2 id={id + "-title"} className="min-w-0 flex-1 pt-1 font-display text-lg font-semibold leading-7 text-brand">{title}</h2>
          <button type="button" onClick={onCancel} aria-label="Đóng thông báo"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-brand hover:bg-brand/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div id={id + "-description"} className="mt-4 flex items-start gap-3 rounded-md bg-brand/5 p-4 text-sm leading-6 text-slate">
          <TriangleAlert className="mt-0.5 shrink-0 text-brand" size={20} aria-hidden="true" />
          <div className="min-w-0">{children}</div>
        </div>
        <div className="mt-6 grid gap-3 min-[360px]:grid-cols-2">
          <button ref={cancel} type="button" className="hsk-button-secondary min-h-11 justify-center" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="hsk-button min-h-11 justify-center" disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
