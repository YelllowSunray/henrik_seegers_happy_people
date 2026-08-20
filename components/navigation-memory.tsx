"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

const SCROLL_KEY = "hp.scrollByKey";
const RESTORE_FLAG = "hp.restoreScroll";

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

function pathKey(pathname: string, search: string) {
  const q = !search ? "" : search.startsWith("?") ? search : `?${search}`;
  return `${pathname}${q}`;
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

  keyRef.current = key;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
  }, []);

  const persistCurrent = useCallback(() => {
    const map = readMap();
    map[keyRef.current] = scrollRef.current;
    writeMap(map);
  }, []);

  // Browser back/forward → restore saved scroll for the page we land on.
  useEffect(() => {
    function onPopState() {
      persistCurrent();
      sessionStorage.setItem(RESTORE_FLAG, "1");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [persistCurrent]);

  // Save scroll before in-app link navigations (before Next resets scrollY).
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      scrollRef.current = window.scrollY;
      persistCurrent();
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      scrollRef.current = window.scrollY;
      persistCurrent();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [persistCurrent]);

  useEffect(() => {
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG) === "1";
    if (shouldRestore) {
      sessionStorage.removeItem(RESTORE_FLAG);
      const map = readMap();
      const y = Number(map[key] ?? 0);
      scrollRef.current = y;
      const restore = () => {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      };
      restore();
      requestAnimationFrame(restore);
      const t1 = window.setTimeout(restore, 50);
      const t2 = window.setTimeout(restore, 150);
      const t3 = window.setTimeout(restore, 400);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }

    scrollRef.current = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [key]);

  // Persist scroll while reading this page.
  useEffect(() => {
    scrollRef.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      scrollRef.current = window.scrollY;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        persistCurrent();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", persistCurrent);
    return () => {
      persistCurrent();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", persistCurrent);
    };
  }, [key, persistCurrent]);

  const goBack = useCallback(() => {
    scrollRef.current = window.scrollY;
    persistCurrent();

    if (typeof window !== "undefined" && window.history.length > 1) {
      sessionStorage.setItem(RESTORE_FLAG, "1");
      router.back();
      return;
    }
    router.push("/");
  }, [persistCurrent, router]);

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
          window.history.back();
        }
      },
    };
  }
  return ctx;
}
