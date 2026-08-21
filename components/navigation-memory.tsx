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

function persistKey(pageKey: string, y: number) {
  const map = readMap();
  map[pageKey] = y;
  writeMap(map);
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
  const restoringRef = useRef(false);

  keyRef.current = key;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }
  }, []);

  // Browser back/forward → restore saved scroll for the page we land on.
  // Do not persist here: keyRef may already be the destination and would
  // overwrite that page's saved scroll with the leaving page's scrollY.
  useEffect(() => {
    function onPopState() {
      sessionStorage.setItem(RESTORE_FLAG, "1");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Save scroll for the page we're leaving before in-app link navigations.
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

  useEffect(() => {
    const shouldRestore = sessionStorage.getItem(RESTORE_FLAG) === "1";
    if (shouldRestore) {
      sessionStorage.removeItem(RESTORE_FLAG);
      const map = readMap();
      const y = Number(map[key] ?? 0);
      scrollRef.current = y;
      restoringRef.current = true;

      const restore = () => {
        window.scrollTo({ top: y, left: 0, behavior: "auto" });
      };
      restore();
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
      });
      const timers = [50, 100, 200, 400, 700, 1200].map((ms) =>
        window.setTimeout(restore, ms),
      );
      const done = window.setTimeout(() => {
        restoringRef.current = false;
        scrollRef.current = window.scrollY;
        persistKey(key, window.scrollY);
      }, 1300);

      return () => {
        timers.forEach((t) => window.clearTimeout(t));
        window.clearTimeout(done);
        restoringRef.current = false;
      };
    }

    restoringRef.current = false;
    scrollRef.current = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [key]);

  // Persist scroll while reading this page — always under this effect's pageKey.
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
      // Persist under the page this effect belonged to — not the new keyRef.
      if (!restoringRef.current) {
        persistKey(pageKey, scrollRef.current);
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

    if (typeof window !== "undefined" && window.history.length > 1) {
      sessionStorage.setItem(RESTORE_FLAG, "1");
      router.back();
      return;
    }
    router.push("/");
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
