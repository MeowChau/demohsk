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
  renderButton: (element: HTMLElement, options: { type: "standard"; theme: "outline" | "filled_black"; size: "large"; text: "signin_with"; shape: "rectangular"; logo_alignment: "center"; locale: "vi"; width: number }) => void;
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
  const buttonFrameRef = useRef<HTMLDivElement>(null);
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
    const frame = buttonFrameRef.current;
    if (!element || !frame || !challenge || !scriptReady) return;
    let previousWidth = 0;
    const render = () => {
      const targetWidth = frame.clientWidth;
      const targetHeight = frame.clientHeight;
      if (!targetWidth || !targetHeight) return;
      const width = Math.min(400, Math.max(200, Math.floor(targetWidth)));
      // GIS owns the real click target; fit it to the shared button without synthetic clicks.
      element.style.width = width + "px";
      element.style.transform = `translate(-50%, -50%) scale(${targetWidth / width}, ${targetHeight / 40})`;
      if (width === previousWidth) return;
      previousWidth = width;
      element.replaceChildren();
      identity()?.renderButton(element, { type: "standard", theme: resolvedTheme === "dark" ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "rectangular", logo_alignment: "center", locale: "vi", width });
    };
    render();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(render);
    observer?.observe(frame);
    return () => { observer?.disconnect(); element.replaceChildren(); };
  }, [challenge, scriptReady, resolvedTheme]);

  useEffect(() => { if (host.current) host.current.inert = disabled || busy; }, [disabled, busy, challenge, scriptReady]);
  useEffect(() => {
    // Cross-origin iframe focus does not consistently match :focus-within in browsers.
    const syncFocus = () => queueMicrotask(() => {
      const frame = buttonFrameRef.current;
      if (frame) frame.toggleAttribute("data-sdk-focused", Boolean(host.current?.contains(document.activeElement)));
    });
    window.addEventListener("blur", syncFocus);
    window.addEventListener("focus", syncFocus);
    document.addEventListener("focusin", syncFocus);
    return () => {
      window.removeEventListener("blur", syncFocus);
      window.removeEventListener("focus", syncFocus);
      document.removeEventListener("focusin", syncFocus);
    };
  }, []);
  const ready = Boolean(challenge && scriptReady && !scriptFailed && !reloadRequired);
  const buttonFrame = "hsk-auth-button bg-surface text-ink dark:bg-paper";
  const onReady = useCallback(() => { setScriptReady(true); setScriptFailed(false); }, []);

  return <section className="mt-6 space-y-3" aria-label="Đăng nhập bằng Google">
    <div className="flex items-center gap-3 text-xs text-slate"><span className="h-px flex-1 bg-mist" /><span>Hoặc tiếp tục với</span><span className="h-px flex-1 bg-mist" /></div>
    {challenge && <Script id="google-identity-services" src="https://accounts.google.com/gsi/client?hl=vi" strategy="afterInteractive" onReady={onReady}
      onError={() => { setScriptFailed(true); setError("Không tải được Google. Vui lòng kiểm tra kết nối hoặc đăng nhập bằng email."); }} />}
    <div ref={buttonFrameRef} aria-busy={busy} aria-disabled={disabled || busy}
      className={buttonFrame + " hsk-google-button " + (!ready ? "hidden" : disabled || busy ? "pointer-events-none opacity-60" : "")}>
      <div ref={host} className="absolute left-1/2 top-1/2 h-10 origin-center overflow-hidden" />
      {/* Keep Google's iframe as the real, accessible control. This non-interactive face supplies the app theme. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 bg-surface px-3 text-ink dark:bg-paper">
        <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" focusable="false">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        <span>Đăng nhập bằng Google</span>
      </span>
    </div>
    {!ready && <button type="button" disabled className={buttonFrame}>{loading || (challenge && !scriptReady && !scriptFailed) ? "Đang tải đăng nhập Google…" : "Đăng nhập bằng Google"}</button>}
    {busy && <p role="status" className="text-center text-sm text-ink">Đang xác thực tài khoản Google…</p>}
    <AccountApprovalDialog open={Boolean(approvalMessage)} message={approvalMessage} onClose={() => setApprovalMessage("")} />
    {error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm leading-6 text-danger"><p>{error}</p><button type="button" className="mt-2 font-semibold underline" onClick={() => { if (scriptFailed || reloadRequired) window.location.reload(); else { setError(""); if (!challenge) setVersion(current => current + 1); } }}>{reloadRequired ? "Tải lại trang" : "Thử lại"}</button></div>}
    <p className="text-center text-xs leading-5 text-slate">Tài khoản mới cần được quản trị viên duyệt trước khi vào học.</p>
  </section>;
}
