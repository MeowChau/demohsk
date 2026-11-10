"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { ApiError, apiFetch, errorMessage } from "@/lib/api/client";
import type { HskUser } from "@/lib/api/types";
import { loginDestination } from "@/lib/auth/login-destination";
import { AccountApprovalDialog } from "@/components/auth/account-approval-dialog";

type Challenge = { clientId: string; nonce: string };
type GoogleLoginResponse = { user: HskUser; status?: never } | { status: "pending_approval"; message: string; user?: never };
type GoogleIdentity = {
  initialize: (options: { client_id: string; nonce: string; auto_select: boolean; use_fedcm_for_button: boolean; button_auto_select: boolean; ux_mode: "popup"; callback: (response: { credential?: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { type: "standard"; theme: "outline" | "filled_black"; size: "large"; text: "signin_with"; shape: "rectangular"; locale: "vi"; width: number }) => void;
};
const identity = () => (window as Window & { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;
type GoogleIdentityState = { identity: GoogleIdentity; clientId: string; nonce: string; callback?: (response: { credential?: string }) => void };
const identityWindow = () => window as Window & { __hskGoogleIdentity?: GoogleIdentityState };
let challengeRequest: Promise<Challenge> | null = null;
function loadChallenge() {
  if (challengeRequest) return challengeRequest;
  challengeRequest = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/auth/google", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(data, response.status));
      if (typeof data?.clientId !== "string" || typeof data?.nonce !== "string") throw new Error("Chưa tải được đăng nhập Google. Vui lòng thử lại.");
      return data as Challenge;
    } finally { clearTimeout(timeout); challengeRequest = null; }
  })();
  return challengeRequest;
}

export function GoogleSignIn({ disabled = false, onBusyChange }: { disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const router = useRouter();
  const search = useSearchParams();
  const { resolvedTheme } = useTheme();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [version, setVersion] = useState(0);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [reloadRequired, setReloadRequired] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const busyRef = useRef(false);
  const disabledRef = useRef(disabled);
  const notifyBusy = useRef(onBusyChange);
  const request = useRef<AbortController | null>(null);
  const callback = useRef<(response: { credential?: string }) => void>(() => {});
  disabledRef.current = disabled;
  notifyBusy.current = onBusyChange;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setChallenge(null);
    void (async () => {
      try {
        const data = await loadChallenge();
        if (!cancelled) setChallenge(data);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error && !(cause instanceof TypeError) ? cause.message : "Chưa tải được đăng nhập Google. Bạn có thể đăng nhập bằng email.");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [version]);

  callback.current = response => {
    if (!mounted.current || busyRef.current || disabledRef.current) return;
    if (!response.credential) { setError("Google chưa trả thông tin đăng nhập. Vui lòng chọn tài khoản lại."); return; }
    busyRef.current = true;
    setBusy(true);
    notifyBusy.current?.(true);
    setError(""); setApprovalMessage("");
    const controller = new AbortController();
    request.current = controller;
    void (async () => {
      try {
        const result = await apiFetch<GoogleLoginResponse>("auth/google/login", {
          method: "POST", body: JSON.stringify({ idToken: response.credential }), signal: controller.signal,
        });
        if (!mounted.current) return;
        if (result.status === "pending_approval") {
          setApprovalMessage(result.message);
          return;
        }
        const { user } = result;
        if (!user?.id) throw new Error("Chưa xác thực được tài khoản Google. Vui lòng thử lại.");
        if (!mounted.current) return;
        router.replace(loginDestination(user, search.get("redirectTo")));
        router.refresh();
      } catch (cause) {
        if (!mounted.current || controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.code === "accountPendingApproval") setApprovalMessage(cause.message);
        else setError(cause instanceof Error ? cause.message : "Không đăng nhập được bằng Google. Vui lòng thử lại.");
        if (cause instanceof ApiError && cause.code === "googleChallengeExpired") setReloadRequired(true);
      } finally {
        busyRef.current = false;
        if (mounted.current) {
          setBusy(false); notifyBusy.current?.(false);
        }
      }
    })();
  };

  useEffect(() => {
    if (!challenge || !scriptReady) return;
    const onCredential = (response: { credential?: string }) => callback.current(response);
    const target = identityWindow();
    try {
      const google = identity();
      if (!google) throw new Error();
      const previous = target.__hskGoogleIdentity;
      if (previous && previous.identity === google) {
        if (previous.clientId !== challenge.clientId || previous.nonce !== challenge.nonce) {
          setReloadRequired(true);
          setError("Phiên đăng nhập Google đã thay đổi. Vui lòng tải lại trang để tiếp tục.");
          return;
        }
        previous.callback = onCredential;
      } else {
        const state: GoogleIdentityState = { identity: google, clientId: challenge.clientId, nonce: challenge.nonce, callback: onCredential };
        google.initialize({ client_id: challenge.clientId, nonce: challenge.nonce, auto_select: false, use_fedcm_for_button: true, button_auto_select: false, ux_mode: "popup", callback: response => state.callback?.(response) });
        target.__hskGoogleIdentity = state;
      }
    } catch { setError("Chưa khởi tạo được đăng nhập Google. Vui lòng tải lại trang hoặc đăng nhập bằng email."); }
    return () => { if (target.__hskGoogleIdentity?.callback === onCredential) target.__hskGoogleIdentity.callback = undefined; };
  }, [challenge, scriptReady]);

  useEffect(() => {
    const element = host.current;
    if (!element || !challenge || !scriptReady) return;
    let previousWidth = 0;
    const render = () => {
      const width = Math.min(400, Math.floor(element.clientWidth));
      if (width < 200 || width === previousWidth) return;
      previousWidth = width;
      element.replaceChildren();
      identity()?.renderButton(element, { type: "standard", theme: resolvedTheme === "dark" ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "rectangular", locale: "vi", width });
    };
    render();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(render);
    observer?.observe(element);
    return () => { observer?.disconnect(); element.replaceChildren(); };
  }, [challenge, scriptReady, resolvedTheme]);

  useEffect(() => { if (host.current) host.current.inert = disabled || busy; }, [disabled, busy, challenge, scriptReady]);
  const ready = Boolean(challenge && scriptReady && !scriptFailed && !reloadRequired);
  const onReady = useCallback(() => { setScriptReady(true); setScriptFailed(false); }, []);

  return <section className="mt-6 space-y-3" aria-label="Đăng nhập bằng Google">
    <div className="flex items-center gap-3 text-xs text-slate"><span className="h-px flex-1 bg-mist" /><span>Hoặc tiếp tục với</span><span className="h-px flex-1 bg-mist" /></div>
    {challenge && <Script id="google-identity-services" src="https://accounts.google.com/gsi/client?hl=vi" strategy="afterInteractive" onReady={onReady}
      onError={() => { setScriptFailed(true); setError("Không tải được Google. Vui lòng kiểm tra kết nối hoặc đăng nhập bằng email."); }} />}
    <div ref={host} aria-busy={busy} aria-disabled={disabled || busy} className={"mx-auto flex min-h-10 w-full max-w-[400px] justify-center overflow-hidden " + (!ready ? "hidden" : disabled || busy ? "pointer-events-none opacity-60" : "")} />
    {!ready && <button type="button" disabled className="hsk-button-secondary w-full">{loading || (challenge && !scriptReady && !scriptFailed) ? "Đang tải đăng nhập Google…" : "Đăng nhập bằng Google"}</button>}
    {busy && <p role="status" className="text-center text-sm text-ink">Đang xác thực tài khoản Google…</p>}
    <AccountApprovalDialog open={Boolean(approvalMessage)} message={approvalMessage} onClose={() => setApprovalMessage("")} />
    {error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm leading-6 text-danger"><p>{error}</p><button type="button" className="mt-2 font-semibold underline" onClick={() => { if (scriptFailed || reloadRequired) window.location.reload(); else { setError(""); if (!challenge) setVersion(current => current + 1); } }}>{reloadRequired ? "Tải lại trang" : "Thử lại"}</button></div>}
    <p className="text-center text-xs leading-5 text-slate">Tài khoản mới cần được quản trị viên duyệt trước khi vào học.</p>
  </section>;
}
