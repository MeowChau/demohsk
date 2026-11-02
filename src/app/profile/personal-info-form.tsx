"use client";

import { useActionState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { updateProfileInfoAction } from "./api-actions";
import { notify } from "@/lib/toast";
import type { ProfileDetail } from "@/lib/repositories/profile.repository";

const BAND_SCORES = [
  "1.0", "2.0", "3.0", "4.0", "5.0", "6.0", "7.0", "8.0", "9.0",
];

type ActionResult = { error?: string; success?: boolean } | null;

async function action(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  return updateProfileInfoAction(formData);
}

export function PersonalInfoForm({
  profile,
  onboardingTargetBand,
  onboardingCurrentBand,
}: {
  profile: ProfileDetail;
  onboardingTargetBand?: number | null;
  onboardingCurrentBand?: number | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (state?.success) notify.success("Profile updated.");
    if (state?.error) notify.error(state.error);
  }, [state]);

  // CRITICAL FIX: Use toFixed(1) so 1.0 becomes "1.0" not "1"
  // This ensures the select defaultValue matches the option values exactly
  const defaultTarget =
    profile.target_band != null
      ? profile.target_band.toFixed(1)
      : onboardingTargetBand != null
      ? onboardingTargetBand.toFixed(1)
      : "";

  const defaultCurrent =
    profile.current_band != null
      ? profile.current_band.toFixed(1)
      : onboardingCurrentBand != null
      ? onboardingCurrentBand.toFixed(1)
      : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          id="firstName"
          name="firstName"
          defaultValue={profile.first_name}
          required
        />
        <Field
          label="Last name"
          id="lastName"
          name="lastName"
          defaultValue={profile.last_name}
          required
        />
      </div>

      <Field
        label="Email"
        id="email"
        defaultValue={profile.email}
        disabled
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Phone"
          id="phone"
          name="phone"
          disabled
          defaultValue={profile.phone ?? ""}
          placeholder="+880..."
        />
        <Field
          label="Date of birth"
          id="dob"
          name="dob"
          disabled
          type="date"
          defaultValue={profile.dob ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Gender"
          id="gender"
          name="gender"
          disabled
          defaultValue={profile.gender ?? ""}
          placeholder="Optional"
        />
        <Field
          label="Address"
          id="address"
          name="address"
          disabled
          defaultValue={profile.address ?? ""}
          placeholder="Optional"
        />
      </div>

      {profile.role === "student" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current band */}
          <div>
            <label
              htmlFor="currentBand"
              className="block text-sm font-bold text-[var(--ink)] mb-1.5 dark:text-white"
            >
              Current HSK level
            </label>
            <div className="relative">
              <select
                id="currentBand"
                name="currentBand"
                defaultValue={defaultCurrent}
                className="w-full h-12 px-4 pr-10 rounded-xl border-2 border-[var(--mist)] bg-white text-[var(--ink)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/20 focus:border-[var(--teal)] transition-all cursor-pointer dark:bg-navy-deep dark:border-slate/20 dark:text-white"
              >
                <option value="" disabled>
                  Select your HSK level
                </option>
                {BAND_SCORES.map((score) => (
                  <option key={score} value={score}>
                    HSK {Number(score)}
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
          </div>

          {/* Target band */}
          <div>
            <label
              htmlFor="targetBand"
              className="block text-sm font-bold text-[var(--ink)] mb-1.5 dark:text-white"
            >
              Target HSK level
            </label>
            <div className="relative">
              <select
                id="targetBand"
                name="targetBand"
                defaultValue={defaultTarget}
                className="w-full h-12 px-4 pr-10 rounded-xl border-2 border-[var(--mist)] bg-white text-[var(--ink)] appearance-none focus:outline-none focus:ring-2 focus:ring-[var(--teal)]/20 focus:border-[var(--teal)] transition-all cursor-pointer dark:bg-navy-deep dark:border-slate/20 dark:text-white"
              >
                <option value="" disabled>
                  Select your target HSK level
                </option>
                {BAND_SCORES.map((score) => (
                  <option key={score} value={score}>
                    HSK {Number(score)}
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
          </div>
        </div>
      )}

      {state?.error && (
        <p className="text-xs text-[var(--danger)]">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-xs text-[var(--success)]">Profile updated.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-full bg-[var(--teal)] px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--teal-deep)] hover:shadow-md disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
