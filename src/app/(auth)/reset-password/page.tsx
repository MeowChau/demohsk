"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { apiAction } from "@/lib/api/client";
import { Field } from "@/components/ui/field";
import { notify } from "@/lib/toast";
import { errorFields } from "@/lib/validations/form-errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError: setFieldError, watch, trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), mode: "onTouched", defaultValues: { password: "", confirmPassword: "" } });
  const passwordValue = watch("password");
  useEffect(() => { if (touchedFields.confirmPassword) void trigger("confirmPassword"); }, [passwordValue, touchedFields.confirmPassword, trigger]);

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const hash = new URLSearchParams(window.location.search).get("hash");
    if (!hash) { setServerError("Hãy mở liên kết đặt lại mật khẩu trong email."); return; }
    try { await apiAction("auth/reset/password", { hash, password: values.password }); }
    catch (error) { const message = error instanceof Error ? error.message : "Không đổi được mật khẩu."; Object.entries(errorFields(error)).forEach(([name, message], index) => { if (name === "password" || name === "confirmPassword") setFieldError(name, { type: "server", message }, { shouldFocus: index === 0 }); }); setServerError(message); notify.error(message); return; }
    notify.success("Đã cập nhật mật khẩu.");
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-navy dark:text-white"> Đã cập nhật mật khẩu </h1>
        <p className="mt-2 text-sm text-slate"> Đang chuyển tới trang đăng nhập… </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-navy dark:text-white">
        Đặt mật khẩu mới </h1>
      <form noValidate onSubmit={handleSubmit(onSubmit)} onChangeCapture={() => setServerError(null)} className="flex flex-col gap-4">
        <Field label="Mật khẩu mới" id="password" type="password" required minLength={6} maxLength={72} autoComplete="new-password" hint="Từ 6 đến 72 ký tự." {...register("password")} error={errors.password?.message} />
        <Field
          label="Xác nhận mật khẩu"
          id="confirmPassword"
          type="password"
          required
          maxLength={72}
          autoComplete="new-password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
        </button>
      </form>
    </>
  );
}
