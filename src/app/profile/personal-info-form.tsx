"use client";

import { useActionState, useEffect, useState } from "react";
import { Field } from "@/components/ui/field";
import { updateProfileInfoAction } from "./api-actions";
import { notify } from "@/lib/toast";
import type { ProfileDetail } from "@/types/profile";
import { HSK_LEVELS } from "@/lib/hsk";
import { profileInfoSchema } from "@/lib/validations/profile";
import { useValidatedForm } from "@/hooks/use-validated-form";
import type { FormActionState } from "@/lib/validations/form-errors";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";

type ActionResult = FormActionState;

async function action(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  return updateProfileInfoAction(formData);
}

export function PersonalInfoForm({
  profile,
}: {
  profile: ProfileDetail;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null
  );
  const validation = useValidatedForm(profileInfoSchema, state);

  useEffect(() => {
    if (state?.success) notify.success("Đã cập nhật mục tiêu học.");
    if (state?.error) notify.error(state.error);
  }, [state]);

  const [currentLevel, setCurrentLevel] = useState(String(profile.current_band ?? ""));
  const [targetLevel, setTargetLevel] = useState(String(profile.target_band ?? ""));
  const [dailyMinutes, setDailyMinutes] = useState(String(profile.daily_study_time ?? ""));

  // Refresh saved fields independently without replacing invalid choices in a draft.
  useEffect(() => { setCurrentLevel(String(profile.current_band ?? "")); }, [profile.current_band]);
  useEffect(() => { setTargetLevel(String(profile.target_band ?? "")); }, [profile.target_band]);
  useEffect(() => { setDailyMinutes(String(profile.daily_study_time ?? "")); }, [profile.daily_study_time]);

  return (
    <form action={formAction} {...validation.formProps} onReset={event => event.preventDefault()} className="flex flex-col gap-4">
      <Field
        label="Tên người dùng"
        id="username"
        name="username"
        defaultValue={profile.username}
        disabled
      />
      <Field
        label="Email"
        id="email"
        defaultValue={profile.email}
        disabled
        
      />

      {profile.role === "student" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current HSK level */}
          <div>
            <label
              htmlFor="currentHskLevel"
              className="block text-sm font-bold text-[var(--ink)] mb-1.5 dark:text-white"
            >
               Cấp độ HSK hiện tại </label>
            <div className="relative">
              <select
                id="currentHskLevel"
                name="currentHskLevel"
                value={currentLevel}
                onChange={event => setCurrentLevel(event.target.value)}
                aria-invalid={Boolean(validation.errors.currentHskLevel)}
                aria-describedby={validation.errors.currentHskLevel ? "currentHskLevel-error" : undefined}
                className={cn("w-full h-12 px-4 pr-10 rounded-xl border border-control bg-surface text-[var(--ink)] appearance-none focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal transition-all cursor-pointer", validation.errors.currentHskLevel && "border-danger focus:border-danger focus:ring-danger/10")}
              >
                <option value="" disabled>
                   Chọn cấp độ HSK hiện tại </option>
                {HSK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    HSK {level}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--slate)]"
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <FieldError id="currentHskLevel-error" message={validation.errors.currentHskLevel} />
          </div>

          {/* Target HSK level */}
          <div>
            <label
              htmlFor="targetHskLevel"
              className="block text-sm font-bold text-[var(--ink)] mb-1.5 dark:text-white"
            >
               Cấp độ HSK mục tiêu </label>
            <div className="relative">
              <select
                id="targetHskLevel"
                name="targetHskLevel"
                value={targetLevel}
                onChange={event => setTargetLevel(event.target.value)}
                aria-invalid={Boolean(validation.errors.targetHskLevel)}
                aria-describedby={"hsk-goal-hint" + (validation.errors.targetHskLevel ? " targetHskLevel-error" : "")}
                className={cn("w-full h-12 px-4 pr-10 rounded-xl border border-control bg-surface text-[var(--ink)] appearance-none focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal transition-all cursor-pointer", validation.errors.targetHskLevel && "border-danger focus:border-danger focus:ring-danger/10")}
              >
                <option value="" disabled>
                   Chọn mục tiêu HSK </option>
                {HSK_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    HSK {level}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--slate)]"
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
              >
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-1 text-xs text-slate-soft" id="hsk-goal-hint">Mục tiêu phải bằng hoặc cao hơn cấp độ hiện tại.</p>
            <FieldError id="targetHskLevel-error" message={validation.errors.targetHskLevel} />
          </div>
        </div>
      )}

      {validation.serverError && (
        <p className="text-xs text-danger" role="alert">{validation.serverError}</p>
      )}

      {validation.isSuccess && (
        <p role="status" className="text-xs text-success"> Đã cập nhật mục tiêu học. </p>
      )}

      {profile.role === "student" && <Field label="Mục tiêu học mỗi ngày (phút)" id="dailyStudyTime" name="dailyStudyTime" type="number" min={1} max={1440} step={1} value={dailyMinutes} onChange={event => setDailyMinutes(event.target.value)} placeholder="Ví dụ: 30" error={validation.errors.dailyStudyTime} hint="Số nguyên từ 1 đến 1440 phút." />}

      {profile.role === "student" && <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-full bg-teal px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-deep hover:shadow-md disabled:opacity-50"
      >
        {pending ? "Đang lưu…" : "Lưu mục tiêu"}
      </button>}
    </form>
  );
}
