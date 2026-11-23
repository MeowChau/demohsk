"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CircleCheck, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { HskAnalytics } from "@/lib/api/types";
import { checkedInOnDate, studyDateKey, type CheckInResponse } from "@/lib/daily-checkin";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CheckInCelebration } from "@/components/gamification/check-in-celebration";

export function DailyCheckInCard({ initialAnalytics, onConfirmed }: {
  initialAnalytics: HskAnalytics;
  onConfirmed?: (result: CheckInResponse) => void;
}) {
  const router = useRouter();
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [date, setDate] = useState(studyDateKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ title: string; message: string; celebrate: boolean } | null>(null);
  const busyRef = useRef(false);
  const sequence = useRef(0);
  const mounted = useRef(false);
  const latestStatus = useRef(initialAnalytics);
  const routerRef = useRef(router);
  routerRef.current = router;
  const checkedIn = checkedInOnDate(analytics, date);

  useEffect(() => { setAnalytics(initialAnalytics); latestStatus.current = initialAnalytics; }, [initialAnalytics]);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let inFlight = false;
    let lastChecked = Date.now();
    const refresh = async () => {
      if (!active || document.visibilityState === "hidden" || busyRef.current || inFlight) return;
      const today = studyDateKey();
      if (latestStatus.current.studyDate === today && Date.now() - lastChecked < 30000) return;
      inFlight = true;
      setDate(today);
      const request = ++sequence.current;
      try {
        const data = await apiFetch<HskAnalytics>("analytics/dashboard");
        if (active && mounted.current && request === sequence.current) {
          const changed = data.studyDate !== latestStatus.current.studyDate || data.checkedInToday !== latestStatus.current.checkedInToday;
          lastChecked = Date.now();
          latestStatus.current = data;
          setAnalytics(data);
          if (changed) routerRef.current.refresh();
        }
      } catch {
        // Keep the last server state and retry stale-day status on the next tick.
      } finally {
        inFlight = false;
      }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(() => { if (studyDateKey() !== latestStatus.current.studyDate) void refresh(); }, 30000);
    if (latestStatus.current.studyDate !== studyDateKey()) void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function checkIn() {
    if (busyRef.current || checkedIn) return;
    busyRef.current = true;
    sequence.current++;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<CheckInResponse>("analytics/ping", {
        method: "POST", body: JSON.stringify({ durationInSeconds: 1, module: "daily_checkin" }),
      });
      if (!mounted.current) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(result.studyDate || "") || typeof result.alreadyCheckedIn !== "boolean" || !Number.isFinite(result.expAwarded))
        throw new Error("Chưa nhận được xác nhận điểm danh. Vui lòng thử lại.");
      setDate(studyDateKey());
      latestStatus.current = { ...latestStatus.current, studyDate: result.studyDate, checkedInToday: true };
      setAnalytics(current => ({ ...current, studyDate: result.studyDate, checkedInToday: true }));
      onConfirmed?.(result);
      setNotice({
        celebrate: !result.alreadyCheckedIn && result.expAwarded > 0,
        title: result.alreadyCheckedIn ? "Hôm nay đã điểm danh" : "Điểm danh thành công",
        message: result.alreadyCheckedIn
          ? "Điểm danh hôm nay đã được ghi nhận trên tài khoản. Hãy quay lại vào ngày mai nhé."
          : `Bạn nhận +${result.expAwarded.toLocaleString("vi-VN")} EXP. Kết quả được đồng bộ trên web và app.`,
      });
      router.refresh();
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Chưa điểm danh được. Vui lòng thử lại.");
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section aria-labelledby="daily-checkin-title" className="relative overflow-hidden rounded-2xl border-3 border-ink bg-surface p-5 shadow-hard dark:border-slate/30 sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal to-cyan" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-mist bg-brand/5 text-brand dark:text-ink">
            <CalendarCheck size={24} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="daily-checkin-title" className="font-display text-lg font-bold text-ink">Điểm danh hàng ngày</h2>
            <p className="mt-1 text-sm text-slate">Nhận EXP một lần mỗi ngày.</p>
          </div>
        </div>
        <button type="button" className="hsk-button w-full shrink-0 sm:w-auto" onClick={checkIn} disabled={busy || checkedIn} aria-busy={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : checkedIn ? <CircleCheck size={18} aria-hidden="true" /> : <CalendarCheck size={18} aria-hidden="true" />}
          {busy ? "Đang điểm danh…" : checkedIn ? "Đã điểm danh hôm nay" : "Điểm danh hôm nay"}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <ConfirmationDialog open={notice !== null} title={notice?.title || "Điểm danh"} confirmLabel="Đã hiểu" cancelLabel={null}
        onCancel={() => setNotice(null)} onConfirm={() => setNotice(null)} icon={<CircleCheck size={20} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />}>
        <p>{notice?.message}</p>
        <CheckInCelebration active={notice?.celebrate === true} />
      </ConfirmationDialog>
    </section>
  );
}
