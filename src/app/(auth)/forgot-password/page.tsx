"use client";

import Link from "next/link";
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
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    try {
      await apiAction("auth/forgot/password", { email: values.email });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không gửi được email.";
      const fields = errorFields(error);
      if (fields.email) {
        setFieldError("email", { type: "server", message: fields.email }, { shouldFocus: true });
      }
      setServerError(message);
      notify.error(message);
      return;
    }
    notify.info("Đã gửi liên kết đặt lại mật khẩu. Kiểm tra hộp thư của bạn.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full text-center" role="status">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Kiểm tra hộp thư
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate">
          Nếu email đã được đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu.
        </p>
        <Link href="/login" className="hsk-auth-button mt-7 bg-teal text-white">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
          Quên mật khẩu
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate">
          Nhập email để nhận liên kết đặt lại mật khẩu.
        </p>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        onChangeCapture={() => setServerError(null)}
        className="flex flex-col gap-5"
      >
        <Field
          label="Địa chỉ email"
          id="email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          required
          maxLength={255}
          {...register("email")}
          error={errors.email?.message}
        />
        {serverError && (
          <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-5 text-danger">
            {serverError}
          </div>
        )}
        <button type="submit" disabled={isSubmitting} className="hsk-auth-button mt-1 bg-teal text-white">
          {isSubmitting ? "Đang gửi…" : "Gửi liên kết đặt lại"}
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
