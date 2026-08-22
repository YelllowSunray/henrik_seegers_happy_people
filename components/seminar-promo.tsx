"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { t } from "@/lib/content";
import { formatEventDate } from "@/lib/seminar-content";
import { useUpcomingEvent } from "@/lib/use-upcoming-event";
import type { Locale } from "@/lib/types";

function usePromoOffset(active: boolean) {
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)");

    function apply() {
      if (!active) {
        document.documentElement.style.setProperty("--seminar-promo-h", "0px");
        return;
      }
      document.documentElement.style.setProperty(
        "--seminar-promo-h",
        mobile.matches ? "2.75rem" : "2.375rem",
      );
    }

    apply();
    mobile.addEventListener("change", apply);
    return () => {
      mobile.removeEventListener("change", apply);
      document.documentElement.style.setProperty("--seminar-promo-h", "0px");
    };
  }, [active]);
}

export function SeminarPromoBar({
  onHero,
  scrolled,
}: {
  onHero: boolean;
  scrolled: boolean;
}) {
  const event = useUpcomingEvent();
  const locale = useLocale() as Locale;
  const tr = useTranslations("seminars");

  usePromoOffset(Boolean(event));

  if (!event) return null;

  const title = t(event.title, locale);
  const date = formatEventDate(event.date, locale);
  const heroAtTop = onHero && !scrolled;
  const lightOnDark = onHero || scrolled;

  const shellClass = heroAtTop
    ? "border-y border-white/40 text-white"
    : lightOnDark
      ? "border-t border-white/10 text-white"
      : "border-t border-line text-ink";

  const dateClass = lightOnDark ? "text-white/65" : "text-ink-soft";
  const dotClass = lightOnDark ? "text-white/35" : "text-line";

  return (
    <div className={`bg-transparent ${shellClass}`}>
      {/* Mobile */}
      <Link
        href="/seminars"
        className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2.5 text-sm md:px-8 lg:hidden"
      >
        <span className="shrink-0 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase drop-shadow-sm">
          {tr("next")}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium drop-shadow-sm">
          {title}
        </span>
        <span className={`hidden shrink-0 drop-shadow-sm sm:inline ${dateClass}`}>
          {date}
        </span>
        <span
          className={`shrink-0 text-xs font-semibold drop-shadow-sm ${
            lightOnDark ? "text-gold" : "text-accent"
          }`}
          aria-hidden
        >
          →
        </span>
      </Link>

      {/* Desktop */}
      <Link
        href="/seminars"
        className="mx-auto hidden max-w-5xl items-center justify-center gap-3 px-8 py-2 text-center transition-opacity hover:opacity-90 lg:flex"
      >
        <span className="shrink-0 text-[10px] font-semibold tracking-[0.18em] text-gold uppercase drop-shadow-sm">
          {tr("next")}
        </span>
        <span className={`shrink-0 ${dotClass}`} aria-hidden>
          ·
        </span>
        <span className="font-display shrink-0 text-[0.95rem] leading-none drop-shadow-sm">
          {title}
        </span>
        <span className={`shrink-0 ${dotClass}`} aria-hidden>
          ·
        </span>
        <span className={`shrink-0 text-sm ${dateClass} drop-shadow-sm`}>
          {date}
        </span>
      </Link>
    </div>
  );
}
