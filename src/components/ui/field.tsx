import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FieldError } from "./field-error";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  endAdornment?: ReactNode;
  hint?: string;
}

export function Field({
  label,
  error,
  endAdornment,
  hint,
  className,
  id,
  ...props
}: FieldProps) {
  const describedBy = [props["aria-describedby"], error ? `${id}-error` : hint ? `${id}-hint` : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-sm font-medium leading-6 text-ink"
      >
        {label}
        {props.required && !props.disabled && <span className="text-[#b42318] dark:text-[#fda29b]" aria-hidden="true"> *</span>}
      </label>

      <div className="relative">
        <input
          {...props}
          id={id}
          aria-invalid={Boolean(error) || props["aria-invalid"]}
          aria-describedby={describedBy}
          className={cn(
            [
              "block h-12 w-full rounded-lg",
              "border border-control",
              "bg-surface",
              "px-4",
              "text-sm text-ink",
              "placeholder:text-slate-soft",
              "outline-none",
              "transition-[border-color,box-shadow,background-color] duration-200",
              "shadow-sm",
              "enabled:hover:border-teal enabled:hover:ring-4 enabled:hover:ring-teal/10",
              "focus:border-teal",
              "focus:ring-4 focus:ring-teal/10",
              "disabled:cursor-not-allowed",
              "disabled:opacity-60",
            ].join(" "),
            endAdornment && "pr-12",
            className,
            error && [
              "border-danger",
              "enabled:hover:border-danger enabled:hover:ring-danger/10",
              "bg-danger/5",
              "focus:border-danger",
              "focus:ring-danger/10",
            ],
          )}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-3 flex items-center">
            {endAdornment}
          </div>
        )}
      </div>

      <FieldError id={`${id}-error`} message={error} />
      {!error && hint && <p id={`${id}-hint`} className="text-xs leading-5 text-slate">{hint}</p>}
    </div>
  );
}
