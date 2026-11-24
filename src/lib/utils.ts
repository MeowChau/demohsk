import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const scoreFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Round only the displayed score; keep the original value for calculations. */
export function formatScore(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "—" : scoreFormatter.format(value);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
