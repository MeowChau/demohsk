"use client";

import { useActionState, useEffect, useState } from "react";
import { Field } from "@/components/ui/field";
import { updateSettingsAction, changePasswordAction, deleteAccountAction } from "./api-actions";
import { notify } from "@/lib/toast";
import type { UserSettings } from "@/types/profile";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { changePasswordSchema } from "@/lib/validations/profile";
import type { FormActionState } from "@/lib/validations/form-errors";

type ActionResult = FormActionState;

async function settingsSubmit(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return updateSettingsAction(formData);
}
async function passwordSubmit(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return changePasswordAction(formData);
}

export function SettingsForm({ settings }: { settings: UserSettings | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(settingsSubmit, null);

  useEffect(() => {
    if (state?.success) notify.success("Đã lưu tùy chọn.");
    if (state?.error) notify.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Toggle
        name="emailNotifications"
        label="Thông báo qua email"
        description="Cập nhật bài học, kết quả và thông báo"
        defaultChecked={settings?.email_notifications ?? true}
      />
      <Toggle
        name="streakReminders"
        label="Nhắc lịch học"
        description="Nhắc bạn duy trì chuỗi ngày học"
        defaultChecked={settings?.streak_reminders ?? true}
      />
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      {state?.success && <p className="text-xs text-success"> Đã lưu tùy chọn. </p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-pill bg-teal px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Lưu tùy chọn"}
      </button>
    </form>
  );
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between rounded-md border border-mist px-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-slate-soft">{description}</p>
      </div>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 rounded accent-teal"
      />
    </label>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(passwordSubmit, null);
  const validation = useValidatedForm(changePasswordSchema, state);

  useEffect(() => {
    if (state?.success) notify.success("Đã cập nhật mật khẩu.");
    if (state?.error) notify.error(state.error);
  }, [state]);

  return (
    <form action={formAction} {...validation.formProps} className="flex flex-col gap-4">
      <Field label="Mật khẩu hiện tại" id="oldPassword" name="oldPassword" type="password" autoComplete="current-password" required maxLength={72} error={validation.errors.oldPassword} />
      <Field label="Mật khẩu mới" id="password" name="password" type="password" autoComplete="new-password" required minLength={6} maxLength={72} error={validation.errors.password} hint="Từ 6 đến 72 ký tự." />
      <Field label="Xác nhận mật khẩu mới" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={72} error={validation.errors.confirmPassword} />
      {validation.serverError && <p className="text-xs text-danger" role="alert">{validation.serverError}</p>}
      {state?.success && <p className="text-xs text-success"> Đã cập nhật mật khẩu. </p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-pill border border-mist px-5 py-2 text-sm font-semibold text-ink transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
      >
        {pending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
      </button>
    </form>
  );
}

export function DeleteAccountSection() {
  const [pending, setPending] = useState(false);

  function handleDeleteClick() {
    notify.confirm(
      "Xác nhận xóa tài khoản? Thao tác này không thể hoàn tác.",
      async () => {
        setPending(true);
        const result = await deleteAccountAction();
        if (result?.error) {
          notify.error(result.error);
          setPending(false);
          return;
        }
        notify.goodbye("Đã xóa tài khoản.");
        window.location.href = "/login";
      },
      "Xác nhận xóa"
    );
  }

  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft p-4">
      <p className="text-sm font-semibold text-danger"> Xóa tài khoản </p>
      <p className="mt-1 text-xs text-slate">
         Yêu cầu này xóa tài khoản của bạn trên hệ thống HSK. Hãy cân nhắc trước khi xác nhận vì không thể hoàn tác. </p>
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={pending}
        className="mt-3 rounded-pill border border-danger px-4 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
      >
        {pending ? "Đang xóa…" : "Xóa tài khoản của tôi"}
      </button>
    </div>
  );
}
