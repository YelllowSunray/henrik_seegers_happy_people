"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeLabels, type Locale } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher({
  variant = "hero",
}: {
  variant?: "hero" | "solid";
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onHero = variant === "hero";
  const current = localeLabels[locale] ?? localeLabels.en;

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${current.native}`}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold tracking-wide sm:gap-2 sm:px-3.5 sm:text-sm ${
          onHero
            ? "border border-white/30 bg-black/25 text-white backdrop-blur"
            : "border border-line bg-white/80 text-ink"
        }`}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 opacity-85 sm:h-4 sm:w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9S14.5 18.2 12 21c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z" />
        </svg>
        <span>{current.short}</span>
        <span
          className={`inline-block text-xs opacity-70 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] min-w-[12.5rem] overflow-auto rounded-xl border border-line bg-bg py-1 shadow-lg"
        >
          {routing.locales.map((code) => {
            const label = localeLabels[code as Locale];
            const active = code === locale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <Link
                  href={pathname}
                  locale={code}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-3 text-base transition hover:bg-bg-deep ${
                    active ? "bg-bg-deep font-semibold text-accent" : "text-ink"
                  }`}
                >
                  <span>{label.native}</span>
                  <span className="text-sm tracking-wide text-ink-soft uppercase">
                    {label.short}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
