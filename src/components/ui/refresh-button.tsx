"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className="hsk-button-secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
    <RefreshCw size={16} className={pending ? "animate-spin" : ""} aria-hidden="true" />{pending ? "Đang cập nhật…" : "Làm mới"}
  </button>;
}
