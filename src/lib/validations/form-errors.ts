import type { ZodIssue } from "zod";

export type FieldErrors = Record<string, string>;
export type FormActionState = { error?: string; fieldErrors?: FieldErrors; success?: boolean } | null;

export function issuesToFieldErrors(issues: ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const name = issue.path[0];
    if (typeof name === "string" && !Object.hasOwn(errors, name)) errors[name] = issue.message;
  }
  return errors;
}

export function errorFields(error: unknown): FieldErrors {
  if (!error || typeof error !== "object" || !("fieldErrors" in error)) return {};
  const fields = error.fieldErrors;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

export function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  const field = Array.from(form.elements).find(element => Object.hasOwn(errors, element.getAttribute("name") || ""));
  if (field instanceof HTMLElement) field.focus();
}
