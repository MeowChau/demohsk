"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { apiAction } from "@/lib/api/client";
import { Field } from "@/components/ui/field";
import { notify } from "@/lib/toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const hash = new URLSearchParams(window.location.search).get("hash");
    if (!hash) { setServerError("Hãy mở liên kết đặt lại mật khẩu trong email."); return; }
    try { await apiAction("auth/reset/password", {hash,password:values.password}); }
    catch(error) {const message=error instanceof Error?error.message:"Không đổi được mật khẩu.";setServerError(message);notify.error(message);return;}
    notify.success("Password updated.");
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-navy dark:text-white">Password updated</h1>
        <p className="mt-2 text-sm text-slate">Taking you to login…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-navy dark:text-white">
        Set a new password
      </h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="New password" id="password" type="password" {...register("password")} error={errors.password?.message} />
        <Field
          label="Confirm password"
          id="confirmPassword"
          type="password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
