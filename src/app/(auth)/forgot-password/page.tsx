"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { apiAction } from "@/lib/api/client";
import { Field } from "@/components/ui/field";
import { notify } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    try { await apiAction("auth/forgot/password", { email: values.email }); }
    catch (error) { const message=error instanceof Error?error.message:"Không gửi được email.";setServerError(message);notify.error(message);return; }
    notify.info("Reset link sent — check your inbox.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-navy dark:text-white">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate">
          If an account exists for that email, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-2 text-center font-display text-2xl font-semibold text-navy dark:text-white">
        Reset your password
      </h1>
      <p className="mb-6 text-center text-sm text-slate">
        Enter your email and we'll send you a reset link.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Email" id="email" type="email" {...register("email")} error={errors.email?.message} />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        <a href="/login" className="font-medium text-teal">Back to login</a>
      </p>
    </>
  );
}
