"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { apiAction, apiFetch } from "@/lib/api/client";
import type { ExamAccess, ExamPayment } from "@/lib/api/types";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

function openCheckout(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || !["pay.payos.vn", "next.pay.payos.vn", "dev.pay.payos.vn", "next.dev.pay.payos.vn"].includes(url.hostname)) throw new Error("Liên kết thanh toán không hợp lệ.");
  window.location.assign(url.toString());
}

export function ExamPurchase({ examId, title, access, paymentId }: { examId: number; title: string; access: ExamAccess; paymentId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [payment, setPayment] = useState<ExamPayment | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const refreshed = useRef(false);
  const price = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(access.price);

  const check = useCallback(async (id: string, signal?: AbortSignal) => {
    if (inFlight.current) return true;
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await apiFetch<ExamPayment>("exam-payments/" + id, { signal });
      if (signal?.aborted) return false;
      if (result.examId !== examId) throw new Error("Giao dịch không thuộc đề thi này.");
      setPayment(result); setError("");
      if (result.accessGranted) {
        setConfirmed(true);
        if (!refreshed.current) { refreshed.current = true; router.refresh(); }
      }
      return ["creating", "pending"].includes(result.status);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Chưa kiểm tra được thanh toán. Vui lòng thử lại.");
      return !signal?.aborted;
    } finally { inFlight.current = false; if (!signal?.aborted) setChecking(false); }
  }, [examId, router]);

  useEffect(() => {
    if (!paymentId || refreshed.current) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function poll() {
      if (controller.signal.aborted) return;
      if (document.visibilityState === "hidden") { timer = setTimeout(poll, 5000); return; }
      const pending = await check(paymentId!, controller.signal);
      if (pending && !controller.signal.aborted && ++attempts < 60) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
  }, [paymentId, check]);

  async function buy() {
    setBusy(true); setError("");
    try {
      const result = await apiAction<ExamPayment | { accessGranted: true }>(`exam-payments/exams/${examId}/checkout`);
      setOpen(false);
      if (result.accessGranted) { setConfirmed(true); refreshed.current = true; router.refresh(); return; }
      if (!("id" in result)) throw new Error("Chưa tạo được giao dịch. Vui lòng thử lại.");
      setPayment(result);
      if (result.checkoutUrl) openCheckout(result.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Chưa mở được thanh toán. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }

  const unlocked = access.canAttempt || confirmed;
  const closed = payment && ["cancelled", "expired"].includes(payment.status);
  return <section className="rounded-lg border border-mist bg-paper p-4 sm:p-5" aria-label="Quyền truy cập đề thi">
    <div className="flex items-start gap-3">
      {unlocked ? <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={22} aria-hidden="true" /> : <LockKeyhole className="mt-0.5 shrink-0 text-brand dark:text-ink" size={22} aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-ink">{unlocked ? "Đã mở đề thi" : "Mua đề thi này"}</h2>
        <p className="mt-1 text-sm leading-6 text-slate">{unlocked ? "Quyền truy cập đã lưu theo tài khoản. Bạn có thể bắt đầu hoặc làm lại đề thi này." : `Mỗi cấp HSK có một đề miễn phí. Đề này có giá ${price}; mua một lần để làm lại khi cần.`}</p>
        {!unlocked && <p className="mt-2 text-2xl font-semibold tabular-nums text-brand dark:text-ink">{price}</p>}
        <div className="mt-3 text-sm leading-6" aria-live="polite">
          {checking && <p className="flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Đang kiểm tra thanh toán…</p>}
          {!unlocked && payment?.status === "pending" && <p className="text-slate">Đang chờ payOS xác nhận thanh toán. Nếu đã chuyển khoản, bạn có thể kiểm tra lại.</p>}
          {!unlocked && payment?.status === "creating" && <p className="text-slate">Đang chờ liên kết thanh toán. Kiểm tra lại để tiếp tục giao dịch.</p>}
          {!unlocked && closed && <p className="text-slate">{payment.status === "cancelled" ? "Giao dịch đã được hủy." : "Liên kết thanh toán đã hết hạn."} Đề chưa được mở; bạn có thể tạo thanh toán mới.</p>}
        </div>
        {error && <p role="alert" className="mt-3 text-sm leading-6 text-danger">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          {!unlocked && <button type="button" className="hsk-button min-h-11" disabled={busy} onClick={() => {
            if (payment?.checkoutUrl && !closed) { try { openCheckout(payment.checkoutUrl); } catch (cause) { setError((cause as Error).message); } }
            else setOpen(true);
          }}><CreditCard size={17} aria-hidden="true" />{busy ? "Đang tạo thanh toán…" : payment?.checkoutUrl && !closed ? "Tiếp tục thanh toán" : "Mua đề · " + price}<ExternalLink size={15} aria-hidden="true" /></button>}
          {(paymentId || payment) && !confirmed && <button type="button" className="hsk-button-secondary min-h-11" disabled={checking || busy} onClick={() => { void check(paymentId || payment!.id); }}><RefreshCw size={16} aria-hidden="true" />Kiểm tra thanh toán</button>}
        </div>
      </div>
    </div>
    <ConfirmationDialog open={open} title="Xác nhận mua đề thi" confirmLabel={busy ? "Đang tạo thanh toán…" : "Thanh toán " + price} cancelLabel="Để sau"
      confirmDisabled={busy} cancelDisabled={busy} onCancel={() => setOpen(false)} onConfirm={() => { void buy(); }}
      icon={<CreditCard size={20} className="mt-0.5 shrink-0 text-brand dark:text-ink" aria-hidden="true" />}>
      <div className="flex flex-col gap-3"><p className="font-semibold text-ink">{title}</p><p>Giá: <strong className="text-ink">{price}</strong>. Quyền làm đề được lưu theo tài khoản và dùng cho các lần làm lại.</p><p>Bạn sẽ được chuyển đến payOS để thanh toán. Đề chỉ mở sau khi giao dịch được xác nhận.</p>{error && <p role="alert" className="text-danger">{error}</p>}</div>
    </ConfirmationDialog>
  </section>;
}
