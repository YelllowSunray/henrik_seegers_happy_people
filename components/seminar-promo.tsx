"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { t } from "@/lib/content";
import { formatEventDate } from "@/lib/seminar-content";
import { useUpcomingEvent } from "@/lib/use-upcoming-event";
import type { Locale } from "@/lib/types";

const PROMO_HEIGHT = "2.75rem";

function usePromoOffset(active: boolean) {
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)");
    function apply() {
      const h = active && mobile.matches ? PROMO_HEIGHT : "0px";
      document.documentElement.style.setProperty("--seminar-promo-h", h);
    }
    apply();
    mobile.addEventListener("change", apply);
    return () => {
      mobile.removeEventListener("change", apply);
      document.documentElement.style.setProperty("--seminar-promo-h", "0px");
    };
  }, [active]);
}

export function SeminarPromoMobileBar({
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

  return (
    <div
      className={`bg-transparent lg:hidden ${
        heroAtTop
          ? "border-y border-white/45 text-white"
          : lightOnDark
            ? "border-t border-white/10 text-white"
            : "border-t border-line text-ink"
      }`}
    >
      <Link
        href="/seminars"
        className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2.5 text-sm md:px-8"
      >
        <span className="shrink-0 text-[10px] font-semibold tracking-[0.16em] text-gold uppercase drop-shadow-sm">
          {tr("next")}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium drop-shadow-sm">
          {title}
        </span>
        <span
          className={`hidden shrink-0 drop-shadow-sm sm:inline ${
            lightOnDark ? "text-white/70" : "text-ink-soft"
          }`}
        >
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
    </div>
  );
}

export function SeminarPromoHeroDesktop() {
  const event = useUpcomingEvent();
  const locale = useLocale() as Locale;
  const tr = useTranslations("seminars");

  if (!event) return null;

  const title = t(event.title, locale);
  const date = formatEventDate(event.date, locale);
  const when = [date, event.time].filter(Boolean).join(" · ");

  return (
    <Link
      href="/seminars"
      className="mb-3 hidden text-white lg:block"
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-gold uppercase drop-shadow-sm">
        {tr("next")}
      </p>
      <p className="font-display mt-1 text-lg leading-tight drop-shadow">
        {title}
      </p>
      <p className="mt-1 text-sm text-white/80 drop-shadow-sm">{when}</p>
      <p className="mt-2 text-xs font-semibold text-gold drop-shadow-sm">
        {tr("reserve")} →
      </p>
    </Link>
  );
}
