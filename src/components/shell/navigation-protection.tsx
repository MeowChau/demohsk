"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { installNavigationProtection, type NavigationBlocker } from "@/lib/navigation-protection";

type Protection = {
  hasUnsavedChanges: boolean;
  register: (blocker: NavigationBlocker) => () => void;
};
const ProtectionContext = createContext<Protection>({
  hasUnsavedChanges: false,
  register: () => () => {},
});

export function NavigationProtectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const controller = useRef<ReturnType<typeof installNavigationProtection> | null>(null);
  const blockerRef = useRef<NavigationBlocker | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    let disposed = false;
    // Install after Next has initialized its own History API integration.
    queueMicrotask(() => {
      if (disposed) return;
      controller.current = installNavigationProtection(href => routerRef.current.push(href));
      controller.current.setBlocker(blockerRef.current);
    });
    return () => {
      disposed = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  const register = useCallback((blocker: NavigationBlocker) => {
    blockerRef.current = blocker;
    controller.current?.setBlocker(blocker);
    setHasUnsavedChanges(true);
    return () => {
      if (blockerRef.current !== blocker) return;
      blockerRef.current = null;
      controller.current?.setBlocker(null);
      setHasUnsavedChanges(false);
    };
  }, []);
  const value = useMemo(() => ({ hasUnsavedChanges, register }), [hasUnsavedChanges, register]);
  return <ProtectionContext.Provider value={value}>{children}</ProtectionContext.Provider>;
}

export function useBlockNavigation(active: boolean, onBlocked: NavigationBlocker) {
  const { register } = useContext(ProtectionContext);
  const callback = useRef(onBlocked);
  callback.current = onBlocked;
  useEffect(() => {
    if (!active) return;
    return register(proceed => callback.current(proceed));
  }, [active, register]);
}

export function useHasUnsavedChanges() {
  return useContext(ProtectionContext).hasUnsavedChanges;
}
