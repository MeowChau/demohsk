"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { StudyModule } from "@/lib/hsk";

export function StudyTracker({ module }: { module: StudyModule }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!module) return;
    let lastTick = performance.now();
    let lastActivity = lastTick;
    let accrued = 0;
    let sending = false;
    const active = () => { lastActivity = performance.now(); };
    const count = () => {
      const now = performance.now();
      if (document.visibilityState === "visible" && document.hasFocus() && now - lastActivity < 60000) accrued += Math.min(5, (now - lastTick) / 1000);
      lastTick = now;
    };
    const flush = async () => {
      count();
      const duration = Math.min(3600, Math.floor(accrued));
      if (duration < 1 || sending) return;
      accrued -= duration; sending = true;
      try {
        const response = await fetch("/api/hsk/analytics/ping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ durationInSeconds: duration, module }), credentials: "same-origin", keepalive: true });
        if (!response.ok) accrued = Math.min(3600, accrued + duration);
      } catch { accrued = Math.min(3600, accrued + duration); }
      finally { sending = false; }
    };
    const visibility = () => { if (document.visibilityState === "hidden") void flush(); else { lastTick = performance.now(); lastActivity = lastTick; } };
    const timer = setInterval(count, 1000);
    const sendTimer = setInterval(() => { void flush(); }, 30000);
    document.addEventListener("pointerdown", active); document.addEventListener("keydown", active); document.addEventListener("scroll", active, true); document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(timer); clearInterval(sendTimer); document.removeEventListener("pointerdown", active); document.removeEventListener("keydown", active); document.removeEventListener("scroll", active, true); document.removeEventListener("visibilitychange", visibility); void flush(); };
  }, [module, pathname]);
  return null;
}
