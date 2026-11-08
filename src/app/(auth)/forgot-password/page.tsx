"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { apiAction } from "@/lib/api/client";
import { Field } from "@/components/ui/field";
import { notify } from "@/lib/toast";
import { errorFields } from "@/lib/validations/form-errors";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), mode: "onTouched", defaultValues: { email: "" } });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    try { await apiAction("auth/forgot/password", { email: values.email }); }
    catch (error) { const message=error instanceof Error?error.message:"Không gửi được email."; const fields = errorFields(error); if (fields.email) setFieldError("email", { type: "server", message: fields.email }, { shouldFocus: true }); setServerError(message);notify.error(message);return; }
    notify.info("Đã gửi liên kết đặt lại mật khẩu. Kiểm tra hộp thư của bạn.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-navy dark:text-white"> Kiểm tra hộp thư </h1>
        <p className="mt-2 text-sm text-slate">
           Nếu email đã được đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu. </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-center font-display text-2xl font-semibold text-navy dark:text-white">
         Quên mật khẩu </h1>
      <p className="mb-6 text-center text-sm text-slate">
         Nhập email để nhận liên kết đặt lại mật khẩu. </p>
      <form noValidate onSubmit={handleSubmit(onSubmit)} onChangeCapture={() => setServerError(null)} className="flex flex-col gap-4">
        <Field label="Email" id="email" type="email" autoComplete="email" required maxLength={255} {...register("email")} error={errors.email?.message} />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Đang gửi…" : "Gửi liên kết đặt lại"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        <a href="/login" className="font-medium text-teal"> Quay lại đăng nhập </a>
      </p>
    </>
  );
}
