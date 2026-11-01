"use client";

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
  ru: "Назад",
  zh: "返回",
  ar: "رجوع",
};

function isHomePath(pathname: string) {
  return pathname === "/" || pathname === "";
}

/** Removed: the floating Terug covered cards and the footer. Header still has it. */
export function SmartBackButton() {
  return null;
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
