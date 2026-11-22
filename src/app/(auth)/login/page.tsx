"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiAction } from "@/lib/api/client";
import { loginDestination } from "@/lib/auth/login-destination";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { AccountApprovalDialog } from "@/components/auth/account-approval-dialog";
import type { HskUser } from "@/lib/api/types";
import { loginSchema } from "@/lib/validations/auth";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { Field } from "@/components/ui/field";

function EyeIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
      <path d="M9.88 4.24A10.5 10.5 0 0 1 12 4c5 0 8.5 4 9.5 6a11.8 11.8 0 0 1-3.17 3.78"/>
      <path d="M6.61 6.61C4.6 7.72 3.21 9.36 2.5 10c1 2 4.5 6 9.5 6 1.07 0 2.06-.2 2.96-.53" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);
  const validation = useValidatedForm(loginSchema);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || googleBusy) return;
    setError("");
    const values = validation.validateForm(event.currentTarget);
    if (!values) return;

    setLoading(true);

    try {
      const { user } = await apiAction<{ user: HskUser }>("auth/email/login", {
        email: values.email,
        password: values.password,
      });

      if (!user) {
        setError("Chưa xác thực được tài khoản. Vui lòng thử lại.");
        return;
      }

      router.push(loginDestination(user, searchParams.get("redirectTo")));

      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.code === "accountPendingApproval") {
        setApprovalPending(true);
        return;
      }
      validation.applyServerError(error);
      setError(error instanceof Error ? error.message : "Không đăng nhập được. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="w-full">

      <div className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold text-teal">
           Chào mừng bạn trở lại </p>

        <h1 className="text-[28px] font-black tracking-tight text-ink sm:text-[32px]">
           Tiếp tục hành trình tiếng Trung </h1>

        <p className="mt-3 text-sm leading-6 text-slate">
           Đăng nhập để tiếp tục học và theo dõi mục tiêu HSK của bạn. </p>
      </div>

      <form {...validation.formProps} onSubmit={handleSubmit} onChangeCapture={event => { validation.formProps.onChangeCapture(event); setError(""); }} className="space-y-5">
        <Field
          id="email"
          name="email"
          type="email"
          label="Địa chỉ email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          maxLength={255}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={validation.errors.email}
        />

        <Field
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          required
          maxLength={72}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={validation.errors.password}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-soft transition-colors hover:bg-mist hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:ring-2 focus-visible:ring-teal/30"
            >
              <EyeIcon hidden={!showPassword} />
            </button>
          }
        />

        <div className="flex items-center justify-between gap-4">
<span className="text-sm text-slate">Tài khoản học viên</span>

          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-teal transition-colors hover:text-teal-deep"
          >
             Quên mật khẩu? </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-5 text-danger"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleBusy}
          className="hsk-auth-button bg-teal text-white"
        >
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
      <GoogleSignIn disabled={loading} onBusyChange={setGoogleBusy} />

      <p className="mt-7 text-center text-sm text-slate">
         Chưa có tài khoản TriceHSK? {" "}
        <Link
          href="/register"
          className="font-semibold text-teal transition-colors hover:text-teal-deep"
        >
           Đăng ký tài khoản </Link>
      </p>
      <AccountApprovalDialog open={approvalPending} onClose={() => setApprovalPending(false)} />
    </div>
  );
}
