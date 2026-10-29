"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { syncMembershipPrices } from "@/lib/cms-price-sync";
import {
  getDefaultHomepageContent,
  HOMEPAGE_DOC_PATH,
  parseHomepageContent,
  type HomepageContent,
} from "@/lib/homepage-content";

type SaveState = "idle" | "saving" | "saved" | "error";

type CmsValue =
  | string
  | string[]
  | Record<string, unknown>
  | Array<Record<string, unknown> | string>;

type CmsContextValue = {
  enabled: boolean;
  ready: boolean;
  content: HomepageContent;
  saveState: SaveState;
  error: string | null;
  setPath: (path: string, value: CmsValue) => void;
  exitCms: () => void;
};

const CmsContext = createContext<CmsContextValue | null>(null);

const DEBOUNCE_MS = 900;

function getAtPath(obj: HomepageContent, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (Array.isArray(acc) && /^\d+$/.test(key)) {
      return acc[Number(key)];
    }
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function setAtPath(
  obj: HomepageContent,
  path: string,
  value: CmsValue,
): HomepageContent {
  const keys = path.split(".");
  const root = structuredClone(obj) as Record<string, unknown>;

  function walk(
    cursor: unknown,
    index: number,
  ): unknown {
    const key = keys[index]!;
    const isLast = index === keys.length - 1;
    if (isLast) {
      if (Array.isArray(cursor) && /^\d+$/.test(key)) {
        const copy = [...cursor];
        copy[Number(key)] = value;
        return copy;
      }
      return { ...(cursor as object), [key]: value };
    }

    if (Array.isArray(cursor) && /^\d+$/.test(key)) {
      const copy = [...cursor];
      const child = copy[Number(key)] ?? {};
      copy[Number(key)] = walk(child, index + 1);
      return copy;
    }

    const record = (cursor ?? {}) as Record<string, unknown>;
    const child = record[key] ?? (/^\d+$/.test(keys[index + 1] ?? "") ? [] : {});
    return {
      ...record,
      [key]: walk(child, index + 1),
    };
  }

  return walk(root, 0) as HomepageContent;
}

export function CmsProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, signOut, loading } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [content, setContent] = useState<HomepageContent>(
    getDefaultHomepageContent,
  );
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(content);

  const enabled = isAdmin && !loading;

  // Force Dutch while editing — never stay on /en, /de, etc.
  useEffect(() => {
    if (!enabled) return;
    if (locale === "nl") return;
    router.replace(pathname || "/", { locale: "nl" });
  }, [enabled, locale, pathname, router]);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured) {
      setReady(true);
      return;
    }
    const ref = doc(
      getClientDb(),
      HOMEPAGE_DOC_PATH.collection,
      HOMEPAGE_DOC_PATH.id,
    );
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // Don't clobber in-progress typing / pending auto-save.
        if (dirty.current || saveTimer.current) return;
        const next = snap.exists()
          ? parseHomepageContent(snap.data() as Record<string, unknown>)
          : getDefaultHomepageContent();
        latest.current = next;
        setContent(next);
        setReady(true);
      },
      (err) => {
        setError(err.message);
        setReady(true);
      },
    );
    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [enabled]);

  const persist = useEffectEvent(async (next: HomepageContent) => {
    if (!isFirebaseConfigured) {
      setSaveState("error");
      setError("Firebase is niet geconfigureerd.");
      return;
    }
    setSaveState("saving");
    setError(null);
    try {
      await setDoc(
        doc(
          getClientDb(),
          HOMEPAGE_DOC_PATH.collection,
          HOMEPAGE_DOC_PATH.id,
        ),
        { ...next, locale: "nl", updatedAt: serverTimestamp() },
        { merge: true },
      );
      // If the user kept typing during the save, flush the newer draft.
      if (latest.current !== next) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaveState("saving");
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null;
          void persist(latest.current);
        }, DEBOUNCE_MS);
        return;
      }
      dirty.current = false;
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    }
  });

  const queueSave = useCallback((next: HomepageContent) => {
    latest.current = next;
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist(latest.current);
    }, DEBOUNCE_MS);
  }, []);

  const setPath = useCallback(
    (path: string, value: CmsValue) => {
      setContent((prev) => {
        let next = setAtPath(prev, path, value);
        if (path.startsWith("membership.") && typeof value === "string") {
          next = syncMembershipPrices(prev, next, path);
        }
        queueSave(next);
        return next;
      });
    },
    [queueSave],
  );

  const exitCms = useCallback(() => {
    void (async () => {
      await signOut();
      router.replace("/");
    })();
  }, [router, signOut]);

  const value = useMemo<CmsContextValue>(
    () => ({
      enabled,
      ready,
      content,
      saveState,
      error,
      setPath,
      exitCms,
    }),
    [enabled, ready, content, saveState, error, setPath, exitCms],
  );

  return (
    <CmsContext.Provider value={value}>
      {children}
      {enabled ? <CmsBottomBar /> : null}
    </CmsContext.Provider>
  );
}

export function useCms() {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used within CmsProvider");
  return ctx;
}

export function useCmsOptional() {
  return useContext(CmsContext);
}

function CmsBottomBar() {
  const { saveState, error, exitCms } = useCms();

  const status =
    saveState === "saving"
      ? "Opslaan…"
      : saveState === "saved"
        ? "Opgeslagen"
        : saveState === "error"
          ? "Fout"
          : "Klaar";

  const statusTone =
    saveState === "error"
      ? "text-red-300"
      : saveState === "saved"
        ? "text-emerald-300"
        : saveState === "saving"
          ? "text-amber-200"
          : "text-white/65";

  const dockRef = useRef<HTMLDivElement>(null);

  // Measure dock + lock horizontal overflow while CMS is open (mobile).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("cms-editing");
    root.style.setProperty("--cms-dock-h", "4.5rem");

    const el = dockRef.current;
    function measure() {
      if (!el) return;
      root.style.setProperty("--cms-dock-h", `${el.offsetHeight}px`);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root.classList.remove("cms-editing");
      root.style.removeProperty("--cms-dock-h");
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90]"
      role="toolbar"
      aria-label="CMS-balk"
    >
      <div
        ref={dockRef}
        className="pointer-events-auto mx-auto w-full max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex min-h-12 w-full items-center gap-2 rounded-full border border-white/10 bg-ink/95 py-1.5 pr-1.5 pl-2 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase">
            CMS · NL
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-xs ${statusTone}`}
            aria-live="polite"
            title={error ?? undefined}
          >
            {status}
            {error ? ` · ${error}` : null}
          </span>
          <button
            type="button"
            onClick={exitCms}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink transition hover:bg-white/90 active:bg-white/80"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  );
}

/** Read live CMS value when editing; otherwise fall back to server-rendered value. */
export function useCmsValue(path: string, fallback: string): string {
  const cms = useCmsOptional();
  if (!cms?.enabled) return fallback;
  const live = getAtPath(cms.content, path);
  return typeof live === "string" ? live : fallback;
}

export function useCmsList(path: string, fallback: string[]): string[] {
  const cms = useCmsOptional();
  if (!cms?.enabled) return fallback;
  const live = getAtPath(cms.content, path);
  return Array.isArray(live) ? (live as string[]) : fallback;
}
