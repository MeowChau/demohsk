export type NavigationBlocker = (proceed: () => void) => void;
type PopStateListener = (event: PopStateEvent) => void;
type SubscribeToPopState = (listener: PopStateListener) => () => void;
const POSITION_KEY = "__triceNavigation";

type Position = { session: string; index: number };
function savedPosition(state: unknown): Position | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[POSITION_KEY];
  if (!value || typeof value !== "object") return null;
  const position = value as Position;
  return typeof position.session === "string" && Number.isSafeInteger(position.index) ? position : null;
}

const pageKey = (href: string) => {
  const url = new URL(href);
  return url.origin + url.pathname + url.search;
};

/** Track real history entries without inserting duplicate entries into the Back stack. */
export function installNavigationProtection(navigate: (href: string) => void, subscribeToPopState?: SubscribeToPopState) {
  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  const initial = savedPosition(window.history.state);
  const session = initial?.session || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  let index = initial?.index ?? 0;
  let currentUrl = window.location.href;
  let blocker: NavigationBlocker | null = null;
  let restoring: { index: number; delta: number } | null = null;
  let replayIndex: number | null = null;
  let allowUnload = false;

  const withPosition = (state: unknown, nextIndex: number) => ({
    ...(state && typeof state === "object" ? state : {}),
    [POSITION_KEY]: { session, index: nextIndex },
  });
  const push: History["pushState"] = function (state, unused, url) {
    originalPush.call(window.history, withPosition(state, index + 1), unused, url);
    index += 1;
    currentUrl = window.location.href;
  };
  const replace: History["replaceState"] = function (state, unused, url) {
    originalReplace.call(window.history, withPosition(state, index), unused, url);
    currentUrl = window.location.href;
  };
  originalReplace.call(window.history, withPosition(window.history.state, index), "", currentUrl);
  window.history.pushState = push;
  window.history.replaceState = replace;

  const requestLeave = (proceed: () => void) => {
    if (blocker) blocker(proceed);
    else proceed();
  };
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!blocker || allowUnload) return;
    event.preventDefault();
    event.returnValue = "";
  };
  const click = (event: MouseEvent) => {
    if (!blocker || event.defaultPrevented || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    const anchor = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const destination = new URL(anchor.href, window.location.href);
    if (!["http:", "https:"].includes(destination.protocol)
      || pageKey(destination.href) === pageKey(window.location.href)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    requestLeave(() => {
      if (destination.origin === window.location.origin) {
        navigate(destination.pathname + destination.search + destination.hash);
      } else {
        allowUnload = true;
        window.location.assign(destination.href);
      }
    });
  };
  const pop = (event: PopStateEvent) => {
    const next = savedPosition(event.state);
    if (!next || next.session !== session) return;
    if (replayIndex === next.index) {
      replayIndex = null;
      index = next.index;
      currentUrl = window.location.href;
      return;
    }
    if (restoring) {
      event.stopImmediatePropagation();
      if (next.index !== restoring.index) {
        window.history.go(restoring.index - next.index);
        return;
      }
      const delta = restoring.delta;
      restoring = null;
      // The original entry and URL are restored before showing the dialog.
      requestLeave(() => {
        replayIndex = index + delta;
        window.history.go(delta);
      });
      return;
    }
    if (blocker && next.index !== index && pageKey(window.location.href) !== pageKey(currentUrl)) {
      event.stopImmediatePropagation();
      restoring = { index, delta: next.index - index };
      window.history.go(index - next.index);
      return;
    }
    index = next.index;
    currentUrl = window.location.href;
  };
  document.addEventListener("click", click, true);
  if (!subscribeToPopState) window.addEventListener("popstate", pop, true);
  const unsubscribePopState = subscribeToPopState?.(pop)
    || (() => window.removeEventListener("popstate", pop, true));

  return {
    requestLeave,
    setBlocker(next: NavigationBlocker | null) {
      blocker = next;
      allowUnload = false;
      window.removeEventListener("beforeunload", beforeUnload);
      if (next) window.addEventListener("beforeunload", beforeUnload);
    },
    dispose() {
      document.removeEventListener("click", click, true);
      unsubscribePopState();
      window.removeEventListener("beforeunload", beforeUnload);
      if (window.history.pushState === push) window.history.pushState = originalPush;
      if (window.history.replaceState === replace) window.history.replaceState = originalReplace;
    },
  };
}
