"use client";

import { useActionState, useEffect } from "react";
import { createSupportTicketAction } from "./actions";
import { notify } from "@/lib/toast";
import { useValidatedForm } from "@/hooks/use-validated-form";
import { supportTicketSchema } from "@/lib/validations/support";
import { Field } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";

type ActionResult = { error?: string; success?: boolean } | null;

export function CreateTicketForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createSupportTicketAction, null);
  const validation = useValidatedForm(supportTicketSchema, state);
  const formRef = validation.formProps.ref;

  useEffect(() => {
    if (state?.success) {
      notify.success("Đã gửi yêu cầu hỗ trợ.");
      formRef.current?.reset();
    }
    if (state?.error) notify.error(state.error);
  }, [state]);

  return (
    <form {...validation.formProps} action={formAction} className="flex flex-col gap-3 rounded-lg bg-surface p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-ink"> Gửi yêu cầu hỗ trợ </h2>
      <Field id="subject" name="subject" label="Tiêu đề yêu cầu" placeholder="Tiêu đề yêu cầu" required error={validation.errors.subject} />
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-medium leading-6 text-ink">Nội dung <span className="text-danger" aria-hidden="true">*</span></label>
        <textarea id="message" name="message" placeholder="Mô tả vấn đề bạn gặp…" required rows={4} aria-invalid={Boolean(validation.errors.message)} aria-describedby={validation.errors.message ? "message-error" : undefined} className={cn("rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-teal", validation.errors.message && "border-danger focus:border-danger")} />
        <FieldError id="message-error" message={validation.errors.message} />
      </div>
      {validation.serverError && <p className="text-sm text-danger" role="alert">{validation.serverError}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-pill bg-teal px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Đang gửi…" : "Gửi yêu cầu"}
      </button>
    </form>
  );
}
