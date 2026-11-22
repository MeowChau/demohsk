"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { apiAction } from "@/lib/api/client";
import { Field } from "@/components/ui/field";
import { notify } from "@/lib/toast";
import { errorFields } from "@/lib/validations/form-errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    watch,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
    defaultValues: { password: "", confirmPassword: "" },
  });
  const passwordValue = watch("password");
  useEffect(() => {
    if (touchedFields.confirmPassword) void trigger("confirmPassword");
  }, [passwordValue, touchedFields.confirmPassword, trigger]);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const hash = new URLSearchParams(window.location.search).get("hash");
    if (!hash) {
      setServerError("Hãy mở liên kết đặt lại mật khẩu trong email.");
      return;
    }
    try {
      await apiAction("auth/reset/password", { hash, password: values.password });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không đổi được mật khẩu.";
      Object.entries(errorFields(error)).forEach(([name, message], index) => {
        if (name === "password" || name === "confirmPassword") {
          setFieldError(name, { type: "server", message }, { shouldFocus: index === 0 });
        }
      });
      setServerError(message);
      notify.error(message);
      return;
    }
    notify.success("Đã cập nhật mật khẩu.");
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="w-full text-center" role="status">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Đã cập nhật mật khẩu
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate">
          Đang chuyển tới trang đăng nhập…
        </p>
        <Link href="/login" className="hsk-auth-button mt-7 bg-teal text-white">
          Đến trang đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Đặt mật khẩu mới
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate">
          Tạo mật khẩu mới để tiếp tục đăng nhập vào TriceHSK.
        </p>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        onChangeCapture={() => setServerError(null)}
        className="flex flex-col gap-5"
      >
        <Field
          label="Mật khẩu mới"
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Ít nhất 6 ký tự"
          required
          minLength={6}
          maxLength={72}
          autoComplete="new-password"
          hint="Từ 6 đến 72 ký tự."
          {...register("password")}
          error={errors.password?.message}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(current => !current)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-soft transition-colors hover:bg-mist hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:ring-2 focus-visible:ring-teal/30"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          }
        />
        <Field
          label="Xác nhận mật khẩu"
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="Nhập lại mật khẩu"
          required
          maxLength={72}
          autoComplete="new-password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-5 text-danger">
            {serverError}
          </div>
        )}
        <button type="submit" disabled={isSubmitting} className="hsk-auth-button mt-1 bg-teal text-white">
          {isSubmitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate">
        <Link href="/login" className="font-semibold text-teal transition-colors hover:text-teal-deep">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
