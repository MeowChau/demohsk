"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiAction } from "@/lib/api/client";
import type { HskUser } from "@/lib/api/types";
import { notify } from "@/lib/toast";

export function EmailVerificationBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    async function check() {
      const user = await apiFetch<HskUser>("auth/me");
      if (user && !user.emailVerifiedAt) {
        setShow(true);
        setEmail(user.email ?? "");
      }
    }
    check().catch(() => {});
  }, []);

  async function handleResend() {
    if (!email) return;
    setResending(true);
    try {
      await apiAction("auth/email/resend", { email });
      notify.success("Verification email resent — check your inbox.");
    } catch(error) { notify.error(error instanceof Error ? error.message : "Không gửi được email."); }
    finally { setResending(false); }
  }

  if (!show) return null;

  return (
    <div className="bg-coral/10 border-b border-coral/20 px-6 py-3 text-sm text-coral-deep flex items-center justify-center gap-2">
      <span>Please verify your email to secure your account.</span>
      <button
        onClick={handleResend}
        disabled={resending}
        className="font-semibold underline hover:no-underline disabled:opacity-50"
      >
        {resending ? "Sending…" : "Resend email"}
      </button>
    </div>
  );
}
