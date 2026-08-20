"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useNavigationMemory } from "@/components/navigation-memory";

const LABELS: Record<string, string> = {
  nl: "Terug",
  en: "Back",
  de: "Zurück",
  fr: "Retour",
  es: "Atrás",
  it: "Indietro",
  ko: "뒤로",
};

function isHomePath(pathname: string) {
  return pathname === "/" || pathname === "";
}

/** Always-visible smart back (header + floating). Restores prior page scroll. */
export function SmartBackButton() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const memory = useNavigationMemory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isHomePath(pathname)) return null;

  const label = LABELS[locale] ?? LABELS.en;

  function onBack() {
    if (memory?.goBack) {
      memory.goBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      sessionStorage.setItem("hp.restoreScroll", "1");
      router.back();
      return;
    }
    router.push("/");
  }

  const floating = (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      className="pointer-events-auto fixed z-[9999] inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(0,0,0,0.55)] transition hover:bg-ink active:scale-[0.98]"
      style={{
        bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        left: "max(1rem, env(safe-area-inset-left))",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>{label}</span>
    </button>
  );

  if (!mounted) return floating;
  return createPortal(floating, document.body);
}

/** Compact back control for the site header row. */
export function HeaderBackButton({
  dark = false,
}: {
  dark?: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const memory = useNavigationMemory();

  if (isHomePath(pathname)) return null;

  const label = LABELS[locale] ?? LABELS.en;

  function onBack() {
    if (memory?.goBack) {
      memory.goBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      sessionStorage.setItem("hp.restoreScroll", "1");
      router.back();
      return;
    }
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition ${
        dark
          ? "border-white/35 bg-black/35 text-white hover:bg-black/55"
          : "border-line bg-white/90 text-ink hover:bg-bg-deep"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
