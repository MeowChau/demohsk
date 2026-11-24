"use client";

import { createContext, useContext, useLayoutEffect } from "react";

export const PageLoadingContext = createContext<{ register: () => () => void } | null>(null);

/** The visual is mounted once by the navigation provider. */
export function LoadingIndicator({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-24">
      <span aria-hidden="true" className="h-8 w-8 animate-spin motion-reduce:animate-none rounded-full border-2 border-mist border-t-teal" />
      <p className="text-sm text-slate-soft">{label}</p>
    </div>
  );
}

/** Next loading.tsx and Suspense boundaries share the same page loading surface. */
export function LoadingSpinner(props: { label?: string }) {
  const pageLoading = useContext(PageLoadingContext);
  useLayoutEffect(() => pageLoading?.register(), [pageLoading]);
  return pageLoading ? null : <LoadingIndicator {...props} />;
}
