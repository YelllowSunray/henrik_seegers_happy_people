"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

const SCROLL_KEY = "hp.scrollByKey";
const STACK_KEY = "hp.navStack";
const RESTORE_FLAG = "hp.restoreScroll";
const PENDING_RESTORE = "hp.pendingRestore";

type StackEntry = { path: string; scrollY: number };

function readMap(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, number>) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function readStack(): StackEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(STACK_KEY) || "[]") as StackEntry[];
  } catch {
    return [];
  }
}

function writeStack(stack: StackEntry[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-20)));
  } catch {
    /* quota / private mode */
  }
}

function persistKey(pageKey: string, y: number) {
  if (y < 0) return;
  const map = readMap();
  map[pageKey] = y;
  writeMap(map);
}

function pathKey(pathname: string, search: string) {
  const q = !search ? "" : search.startsWith("?") ? search : `?${search}`;
  return `${pathname}${q}`;
}

function maxScrollY() {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
}

function clampScrollY(y: number) {
  return Math.min(Math.max(0, y), maxScrollY());
}

function readPendingRestore(): StackEntry | null {
  try {
    const raw = sessionStorage.getItem(PENDING_RESTORE);
    if (!raw) return null;
    return JSON.parse(raw) as StackEntry;
  } catch {
    return null;
  }
}

function startScrollRestore(
  targetY: number,
  pageKey: string,
  restoringRef: React.MutableRefObject<boolean>,
  scrollRef: React.MutableRefObject<number>,
) {
  restoringRef.current = true;
  scrollRef.current = targetY;
  persistKey(pageKey, targetY);

  let cancelled = false;
  let timers: number[] = [];
  let doneTimer = 0;
  let ro: ResizeObserver | null = null;
  let lastProgrammaticAt = 0;

  const finish = (finalY?: number) => {
    if (cancelled) return;
    cancelled = true;
    ro?.disconnect();
    timers.forEach((t) => window.clearTimeout(t));
    if (doneTimer) window.clearTimeout(doneTimer);
    window.removeEventListener("wheel", onUserIntent);
    window.removeEventListener("touchmove", onUserIntent);
    window.removeEventListener("keydown", onKeyIntent);
    window.removeEventListener("scroll", onUserScroll, { capture: true });
    restoringRef.current = false;
    const y = finalY ?? window.scrollY;
    scrollRef.current = y;
    persistKey(pageKey, y);
  };

  const onUserIntent = () => finish();
  const onKeyIntent = (e: KeyboardEvent) => {
    const keys = [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      " ",
    ];
    if (keys.includes(e.key)) finish();
  };
  const onUserScroll = () => {
    if (cancelled) return;
    if (Date.now() - lastProgrammaticAt > 80) finish();
  };

  const attempt = () => {
    if (cancelled) return;
    const desired = clampScrollY(targetY);
    const current = window.scrollY;

    if (Math.abs(current - desired) <= 64) {
      finish(desired);
      return;
    }

    // Still loading — page not tall enough yet; scroll down when we can.
    if (current < desired - 64) {
      lastProgrammaticAt = Date.now();
      window.scrollTo({ top: desired, left: 0, behavior: "auto" });
      if (Math.abs(window.scrollY - desired) <= 64) finish(desired);
      return;
    }

    // Next.js reset us to the top after a successful restore.
    if (targetY > 200 && current < 120) {
      lastProgrammaticAt = Date.now();
      window.scrollTo({ top: desired, left: 0, behavior: "auto" });
      if (Math.abs(window.scrollY - desired) <= 64) finish(desired);
    }
  };

  window.addEventListener("wheel", onUserIntent, { passive: true });
  window.addEventListener("touchmove", onUserIntent, { passive: true });
  window.addEventListener("keydown", onKeyIntent);
  window.addEventListener("scroll", onUserScroll, { capture: true, passive: true });

  attempt();
  requestAnimationFrame(attempt);

  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      if (!cancelled) attempt();
    });
    ro.observe(document.documentElement);
    ro.observe(document.body);
  }

  timers = [50, 120, 250, 450, 700, 1000, 1500, 2000].map((ms) =>
    window.setTimeout(attempt, ms),
  );
  doneTimer = window.setTimeout(() => finish(clampScrollY(targetY)), 2200);

  return () => finish();
}

type NavMemoryApi = {
  goBack: () => void;
};

const NavMemoryContext = createContext<NavMemoryApi | null>(null);

function NavigationMemoryInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const search = searchParams?.toString() ?? "";
  const key = pathKey(pathname, search);
  const keyRef = useRef(key);
  const scrollRef = useRef(0);
  const restoringRef = useRef(false);
  const cleanupRestoreRef = useRef<(() => void) | null>(null);

  keyRef.current = key;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onPopState() {
      sessionStorage.setItem(RESTORE_FLAG, "1");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function capture() {
      const y = window.scrollY;
      scrollRef.current = y;
      persistKey(keyRef.current, y);
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (!target?.closest?.("a[href]")) return;
      capture();
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target?.closest?.("a[href]")) return;
      capture();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const runRestore = useCallback(
    (pageKey: string) => {
      cleanupRestoreRef.current?.();
      cleanupRestoreRef.current = null;

      const pending = readPendingRestore();
      sessionStorage.removeItem(PENDING_RESTORE);

      const map = readMap();
      const y = Number(
        pending?.path === pageKey ? pending.scrollY : (map[pageKey] ?? 0),
      );

      if (y <= 0) {
        restoringRef.current = false;
        scrollRef.current = 0;
        return undefined;
      }

      cleanupRestoreRef.current = startScrollRestore(
        y,
        pageKey,
        restoringRef,
        scrollRef,
      );
      return cleanupRestoreRef.current;
    },
    [],
  );

  useLayoutEffect(() => {
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG) === "1";
    if (!shouldRestore) return undefined;
    sessionStorage.removeItem(RESTORE_FLAG);
    return runRestore(key);
  }, [key, runRestore]);

  useEffect(() => {
    if (restoringRef.current) return undefined;

    cleanupRestoreRef.current?.();
    cleanupRestoreRef.current = null;
    scrollRef.current = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [key]);

  useEffect(() => {
    const pageKey = key;
    if (!restoringRef.current) {
      scrollRef.current = window.scrollY;
    }
    let ticking = false;
    const onScroll = () => {
      if (restoringRef.current) return;
      scrollRef.current = window.scrollY;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        persistKey(pageKey, scrollRef.current);
        ticking = false;
      });
    };
    const onHide = () => {
      if (restoringRef.current) return;
      persistKey(pageKey, scrollRef.current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onHide);
    return () => {
      if (!restoringRef.current) {
        persistKey(pageKey, scrollRef.current);
        if (sessionStorage.getItem(RESTORE_FLAG) !== "1") {
          const stack = readStack();
          stack.push({ path: pageKey, scrollY: scrollRef.current });
          writeStack(stack);
        }
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onHide);
    };
  }, [key]);

  const goBack = useCallback(() => {
    const pageKey = keyRef.current;
    const y = window.scrollY;
    scrollRef.current = y;
    persistKey(pageKey, y);

    const stack = readStack();
    const prev = stack.length > 0 ? stack[stack.length - 1]! : null;
    if (prev) {
      persistKey(prev.path, prev.scrollY);
      sessionStorage.setItem(PENDING_RESTORE, JSON.stringify(prev));
      writeStack(stack.slice(0, -1));
    }

    sessionStorage.setItem(RESTORE_FLAG, "1");

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    const target = (prev?.path ?? "/") as "/";
    router.push(target, { scroll: false });
  }, [router]);

  const api = useMemo(() => ({ goBack }), [goBack]);

  return (
    <NavMemoryContext.Provider value={api}>{children}</NavMemoryContext.Provider>
  );
}

export function NavigationMemory({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <NavMemoryContext.Provider
          value={{
            goBack: () => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                sessionStorage.setItem(RESTORE_FLAG, "1");
                window.history.back();
              }
            },
          }}
        >
          {children}
        </NavMemoryContext.Provider>
      }
    >
      <NavigationMemoryInner>{children}</NavigationMemoryInner>
    </Suspense>
  );
}

export function useNavigationMemory() {
  const ctx = useContext(NavMemoryContext);
  if (!ctx) {
    return {
      goBack: () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          sessionStorage.setItem(RESTORE_FLAG, "1");
          window.history.back();
        }
      },
    };
  }
  return ctx;
}
