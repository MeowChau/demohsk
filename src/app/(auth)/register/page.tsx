"use client";

import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserCheck } from "lucide-react";
import { Field } from "@/components/ui/field";
import { AccountApprovalDialog } from "@/components/auth/account-approval-dialog";
import { apiAction } from "@/lib/api/client";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { errorFields } from "@/lib/validations/form-errors";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [approvalNoticeOpen, setApprovalNoticeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError: setFieldError, watch, trigger, formState: { errors, isSubmitting, touchedFields } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  const passwordValue = watch("password");
  useEffect(() => { if (touchedFields.confirmPassword) void trigger("confirmPassword"); }, [passwordValue, touchedFields.confirmPassword, trigger]);

  async function onSubmit(values: SignupInput) {
    setError("");
    try {
      await apiAction("auth/email/register", {
        username: values.username,
        email: values.email,
        password: values.password,
      });
      setRegisteredEmail(values.email);
      setApprovalNoticeOpen(true);
    } catch (cause) {
      Object.entries(errorFields(cause)).forEach(([name, message], index) => {
        if (["username", "email", "password", "confirmPassword"].includes(name)) setFieldError(name as keyof SignupInput, { type: "server", message }, { shouldFocus: index === 0 });
      });
      setError(cause instanceof Error ? cause.message : "Chưa đăng ký được tài khoản. Vui lòng thử lại.");
    }
  }

  if (registeredEmail) return (
    <div className="w-full text-center" role="status">
      <UserCheck className="mx-auto mb-5 h-12 w-12 text-teal" aria-hidden="true" />
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Đăng ký thành công</h1>
      <p className="mt-4 text-sm leading-6 text-slate">
        Tài khoản <strong className="break-all text-ink">{registeredEmail}</strong> đã được đăng ký.
        Vui lòng chờ quản trị viên duyệt tài khoản trước khi đăng nhập.
      </p>
      <Link href="/login" className="hsk-auth-button mt-7 bg-teal text-white">
        Đến trang đăng nhập
      </Link>
      <AccountApprovalDialog open={approvalNoticeOpen} registeredEmail={registeredEmail} onClose={() => setApprovalNoticeOpen(false)} />
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold text-teal">你好 · Bắt đầu hành trình tiếng Trung</p>
        <h1 className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">Tạo tài khoản TriceHSK</h1>
        <p className="mt-3 text-sm leading-6 text-slate">Học từ vựng, luyện các kỹ năng và đặt mục tiêu HSK của bạn.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} onChangeCapture={() => setError("")} className="flex flex-col gap-5" noValidate>
        <Field label="Tên người dùng" id="username" autoComplete="username" placeholder="Tên bạn muốn sử dụng" required maxLength={255} {...register("username")} error={errors.username?.message} />
        <Field label="Email" id="email" type="email" autoComplete="email" placeholder="ban@example.com" required maxLength={255} {...register("email")} error={errors.email?.message} />
        <Field
          label="Mật khẩu"
          id="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Ít nhất 6 ký tự"
          maxLength={72}
          minLength={6}
          required
          hint="Từ 6 đến 72 ký tự."
          {...register("password")}
          error={errors.password?.message}
          endAdornment={
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-soft hover:bg-mist focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal focus-visible:ring-2 focus-visible:ring-teal/30">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <Field label="Xác nhận mật khẩu" id="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Nhập lại mật khẩu" required maxLength={72} {...register("confirmPassword")} error={errors.confirmPassword?.message} />
        {error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm leading-5 text-danger">{error}</div>}
        <button type="submit" disabled={isSubmitting} className="hsk-auth-button mt-1 bg-teal text-white">
          {isSubmitting ? "Đang tạo tài khoản…" : "Đăng ký"}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-slate">Đã có tài khoản? <Link href="/login" className="font-semibold text-teal hover:text-teal-deep">Đăng nhập</Link></p>
    </div>
  );
}
