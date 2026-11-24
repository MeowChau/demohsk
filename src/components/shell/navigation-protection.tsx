"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ComponentPropsWithoutRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingIndicator, PageLoadingContext } from "@/components/ui/loading-spinner";
import { installNavigationProtection, type NavigationBlocker } from "@/lib/navigation-protection";

type Router = ReturnType<typeof useRouter>;
type LoadingRouter = Pick<Router, "push" | "replace" | "back" | "forward">;
const NavigationContext = createContext<LoadingRouter | null>(null);
type Protection = {
  hasUnsavedChanges: boolean;
  register: (blocker: NavigationBlocker) => () => void;
};
const ProtectionContext = createContext<Protection>({
  hasUnsavedChanges: false,
  register: () => () => {},
});

function needsNavigationLoading(destination: URL) {
  // Authentication pages keep Next's default navigation, without the full-page overlay.
  if (["/login", "/register", "/signup"].includes(destination.pathname.replace(/\/$/, ""))) return false;
  return destination.origin === window.location.origin &&
    (destination.pathname !== window.location.pathname || destination.search !== window.location.search);
}

export function NavigationProtectionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const controller = useRef<ReturnType<typeof installNavigationProtection> | null>(null);
  const blockerRef = useRef<NavigationBlocker | null>(null);
  const popListenerRef = useRef<((event: PopStateEvent) => void) | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pageLoaders, setPageLoaders] = useState<ReadonlySet<symbol>>(() => new Set());
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const showLoading = pending || pageLoaders.size > 0;
  const registerPageLoading = useCallback(() => {
    const token = Symbol("page-loading");
    setPageLoaders(previous => new Set(previous).add(token));
    return () => setPageLoaders(previous => {
      if (!previous.has(token)) return previous;
      const next = new Set(previous);
      next.delete(token);
      return next;
    });
  }, []);
  const pageLoading = useMemo(() => ({ register: registerPageLoading }), [registerPageLoading]);

  useEffect(() => { setPortalHost(document.body); }, []);
  const destinationRef = useRef<string | null>(null);

  const navigate = useCallback((href: string, replace: boolean, options?: Parameters<Router["push"]>[1]) => {
    const destination = new URL(href, window.location.href);
    const action = () => replace ? routerRef.current.replace(href, options) : routerRef.current.push(href, options);
    // Question anchors and links to the current page keep their normal scroll behaviour.
    if (!needsNavigationLoading(destination)) { action(); return; }
    const key = destination.pathname + destination.search;
    if (destinationRef.current === key) return;
    destinationRef.current = key;
    // Next keeps this transition pending until the destination or its loading boundary commits.
    startTransition(action);
  }, []);
  const navigation = useMemo<LoadingRouter>(() => ({
    push: (href, options) => navigate(href, false, options),
    replace: (href, options) => navigate(href, true, options),
    back: () => startTransition(() => routerRef.current.back()),
    forward: () => startTransition(() => routerRef.current.forward()),
  }), [navigate]);

  useEffect(() => {
    if (!pending) destinationRef.current = null;
  }, [pending]);

  useEffect(() => {
    if (!showLoading) return;
    const main = document.querySelector("main");
    if (!main) return;
    const wasInert = main.inert;
    const wasBusy = main.getAttribute("aria-busy");
    main.inert = true;
    main.setAttribute("aria-busy", "true");
    return () => {
      main.inert = wasInert;
      if (wasBusy === null) main.removeAttribute("aria-busy");
      else main.setAttribute("aria-busy", wasBusy);
    };
  }, [showLoading]);

  useLayoutEffect(() => {
    // Bind before Next's passive popstate listener so it cannot switch pages first.
    const onPopState = (event: PopStateEvent) => popListenerRef.current?.(event);
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, []);

  useEffect(() => {
    let disposed = false;
    // Install after Next has initialized its own History API integration.
    queueMicrotask(() => {
      if (disposed) return;
      controller.current = installNavigationProtection(href => navigation.push(href), listener => {
        popListenerRef.current = listener;
        return () => {
          if (popListenerRef.current === listener) popListenerRef.current = null;
        };
      });
      controller.current.setBlocker(blockerRef.current);
    });
    return () => {
      disposed = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, [navigation]);

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
  return <ProtectionContext.Provider value={value}>
    <NavigationContext.Provider value={navigation}>
      <PageLoadingContext.Provider value={pageLoading}>
        {children}
        {/* Keep the same DOM/spinner when a router transition hands over to a route fallback. */}
        {portalHost && createPortal(<div hidden={!showLoading}
          className="fixed inset-x-0 bottom-0 top-20 z-40 overflow-y-auto bg-paper px-4"
          data-page-loading-surface data-navigation-loading={showLoading ? "" : undefined}>
          <LoadingIndicator />
        </div>, portalHost)}
      </PageLoadingContext.Provider>
    </NavigationContext.Provider>
  </ProtectionContext.Provider>;
}

/** Preserve Next prefetch, modifier keys, downloads, custom click handlers and new tabs. */
export const NavigationLink = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<typeof Link>>(function NavigationLink({ onNavigate, replace, scroll, ...props }, forwardedRef) {
  const navigation = useContext(NavigationContext);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  return <Link {...props} replace={replace} scroll={scroll} ref={element => {
    anchorRef.current = element;
    if (typeof forwardedRef === "function") forwardedRef(element);
    else if (forwardedRef) forwardedRef.current = element;
  }} onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented || !navigation || !anchorRef.current) return;
    const destination = new URL(anchorRef.current.href);
    if (!needsNavigationLoading(destination)) return;
    event.preventDefault();
    const href = destination.pathname + destination.search + destination.hash;
    if (replace) navigation.replace(href, { scroll });
    else navigation.push(href, { scroll });
  }} />;
});

/** Add the same transition feedback to buttons that navigate programmatically. */
export function useNavigationRouter(): Router {
  const router = useRouter();
  const navigation = useContext(NavigationContext);
  return useMemo(() => navigation ? { ...router, ...navigation } : router, [router, navigation]);
}

/** GET filters use client navigation; without JavaScript they remain native forms. */
export function NavigationForm({ action, onSubmit, ...props }: Omit<ComponentPropsWithoutRef<"form">, "action"> & { action: string }) {
  const navigation = useContext(NavigationContext);
  return <form {...props} action={action} onSubmit={event => {
    onSubmit?.(event);
    const form = event.currentTarget;
    if (event.defaultPrevented || !navigation || form.method !== "get" || (form.target && form.target !== "_self")) return;
    const destination = new URL(action, window.location.href);
    if (destination.origin !== window.location.origin) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter?.hasAttribute("formaction") || submitter?.hasAttribute("formmethod")) return;
    const fields = new FormData(form, submitter);
    destination.search = new URLSearchParams(Array.from(fields, ([key, value]) => [key, typeof value === "string" ? value : value.name])).toString();
    event.preventDefault();
    navigation.push(destination.pathname + destination.search + destination.hash);
  }} />;
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
