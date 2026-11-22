"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type FocusEvent } from "react";
import type { z } from "zod";
import { errorFields, focusFirstError, issuesToFieldErrors, type FieldErrors, type FormActionState } from "@/lib/validations/form-errors";

export function useValidatedForm<T extends z.ZodTypeAny>(schema: T, state?: FormActionState) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [edited, setEdited] = useState(false);
  const touched = useRef(new Set<string>());
  const submitted = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const serverErrors = useRef<FieldErrors>({});

  useEffect(() => {
    serverErrors.current = state?.fieldErrors || {};
    setErrors(serverErrors.current);
    setEdited(false);
    if (formRef.current && state?.fieldErrors) focusFirstError(formRef.current, state.fieldErrors);
  }, [state]);

  function read(form: HTMLFormElement) {
    return schema.safeParse(Object.fromEntries(new FormData(form)));
  }

  function validateForm(form: HTMLFormElement): z.infer<T> | null {
    submitted.current = true;
    serverErrors.current = {};
    setEdited(true);
    const result = read(form);
    const next = result.success ? {} : issuesToFieldErrors(result.error.issues);
    setErrors(next);
    if (!result.success) { focusFirstError(form, next); return null; }
    return result.data;
  }

  function validateTouched(form: HTMLFormElement) {
    const result = read(form);
    const next = result.success ? {} : issuesToFieldErrors(result.error.issues);
    const clientErrors = submitted.current ? next : Object.fromEntries(Object.entries(next).filter(([name]) => touched.current.has(name)));
    setErrors({ ...serverErrors.current, ...clientErrors });
  }

  function onBlurCapture(event: FocusEvent<HTMLFormElement>) {
    const name = event.target instanceof HTMLElement ? event.target.getAttribute("name") : null;
    if (!name) return;
    touched.current.add(name);
    validateTouched(event.currentTarget);
  }

  function onChangeCapture(event: FormEvent<HTMLFormElement>) {
    setEdited(true);
    const name = event.target instanceof HTMLElement ? event.target.getAttribute("name") : null;
    if (name) delete serverErrors.current[name];
    if (name && errors[name]) touched.current.add(name);
    validateTouched(event.currentTarget);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateForm(event.currentTarget)) event.preventDefault();
  }

  const applyServerError = useCallback((error: unknown) => {
    serverErrors.current = errorFields(error);
    setErrors(serverErrors.current);
    if (formRef.current) focusFirstError(formRef.current, serverErrors.current);
  }, []);
  return { errors, validateForm, applyServerError, serverError: edited ? undefined : state?.error,
    formProps: { ref: formRef, noValidate: true, onSubmit, onBlurCapture, onChangeCapture } };
}
