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
  /** Warning when another CMS tab is open or overwrote content. */
  tabWarning: string | null;
  setPath: (path: string, value: CmsValue) => void;
  exitCms: () => void;
};

const CmsContext = createContext<CmsContextValue | null>(null);

const DEBOUNCE_MS = 900;
const PRICE_SYNC_MS = 750;
const CMS_TAB_CHANNEL = "hp-cms-tab";

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
  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceBase = useRef<HomepageContent | null>(null);
  const pricePath = useRef<string | null>(null);
  const dirty = useRef(false);
  const latest = useRef(content);
  const lastWrittenMs = useRef(0);
  const tabId = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}`,
  );

  const enabled = isAdmin && !loading;

  // Force Dutch while editing — never stay on /en, /de, etc.
  useEffect(() => {
    if (!enabled) return;
    if (locale === "nl") return;
    router.replace(pathname || "/", { locale: "nl" });
  }, [enabled, locale, pathname, router]);

  // Warn when CMS is open in another browser tab.
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(CMS_TAB_CHANNEL);
    const id = tabId.current;
    bc.postMessage({ type: "hello", id });
    bc.onmessage = (ev) => {
      const data = ev.data as { type?: string; id?: string } | null;
      if (!data || data.id === id) return;
      if (data.type === "hello" || data.type === "ping") {
        setTabWarning(
          "CMS staat ook open in een ander tabblad — wijzigingen kunnen elkaar overschrijven.",
        );
        bc.postMessage({ type: "ack", id });
      }
      if (data.type === "ack") {
        setTabWarning(
          "CMS staat ook open in een ander tabblad — wijzigingen kunnen elkaar overschrijven.",
        );
      }
    };
    const ping = window.setInterval(() => {
      bc.postMessage({ type: "ping", id });
    }, 15000);
    return () => {
      window.clearInterval(ping);
      bc.close();
    };
  }, [enabled]);

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
        const remoteMs = (() => {
          const raw = snap.data()?.updatedAt as
            | { toMillis?: () => number }
            | undefined;
          return raw?.toMillis?.() ?? 0;
        })();

        // Don't clobber in-progress typing / pending auto-save.
        if (dirty.current || saveTimer.current) {
          if (
            remoteMs > lastWrittenMs.current + 800 &&
            lastWrittenMs.current > 0
          ) {
            setTabWarning(
              "Een andere tab heeft opgeslagen terwijl jij typt. Vernieuw om die versie te zien, of blijf typen om te overschrijven.",
            );
          }
          return;
        }
        const next = snap.exists()
          ? parseHomepageContent(snap.data() as Record<string, unknown>)
          : getDefaultHomepageContent();
        latest.current = next;
        if (remoteMs) lastWrittenMs.current = remoteMs;
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
      if (priceTimer.current) clearTimeout(priceTimer.current);
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
      lastWrittenMs.current = Date.now();
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
        const next = setAtPath(prev, path, value);
        // Debounce price sync so mid-typing (€2 → €20) doesn't thrash related copy.
        if (path.startsWith("membership.") && typeof value === "string") {
          if (!priceBase.current) priceBase.current = prev;
          pricePath.current = path;
          if (priceTimer.current) clearTimeout(priceTimer.current);
          priceTimer.current = setTimeout(() => {
            const base = priceBase.current;
            const syncPath = pricePath.current;
            priceBase.current = null;
            pricePath.current = null;
            priceTimer.current = null;
            if (!base || !syncPath) return;
            setContent((cur) => {
              const synced = syncMembershipPrices(base, cur, syncPath);
              if (synced === cur) return cur;
              queueSave(synced);
              return synced;
            });
          }, PRICE_SYNC_MS);
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
      tabWarning,
      setPath,
      exitCms,
    }),
    [enabled, ready, content, saveState, error, tabWarning, setPath, exitCms],
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
  const { saveState, error, tabWarning, exitCms } = useCms();

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
        <div className="space-y-1.5">
          {tabWarning ? (
            <p className="rounded-2xl border border-amber-300/40 bg-amber-950/90 px-3 py-2 text-[11px] leading-snug text-amber-100 shadow-lg backdrop-blur-md">
              {tabWarning}
            </p>
          ) : null}
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
