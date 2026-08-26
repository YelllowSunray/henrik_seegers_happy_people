"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

function usePromoOffset() {
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)");

    function apply() {
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
  }, []);
}

export function SeminarPromoBar({
  onHero,
  scrolled,
}: {
  onHero: boolean;
  scrolled: boolean;
}) {
  const t = useTranslations("site");

  usePromoOffset();

  const heroAtTop = onHero && !scrolled;
  const lightOnDark = onHero || scrolled;

  const shellClass = heroAtTop
    ? "border-y border-white/40 text-white"
    : lightOnDark
      ? "border-t border-white/10 text-white"
      : "border-t border-line text-ink";

  return (
    <div className={`bg-transparent ${shellClass}`}>
      {/* Mobile */}
      <p className="mx-auto flex max-w-7xl items-center justify-center px-5 py-2.5 text-center text-sm font-medium lg:hidden md:px-8">
        <span className="drop-shadow-sm">{t("underConstruction")}</span>
      </p>

      {/* Desktop */}
      <p className="mx-auto hidden max-w-5xl items-center justify-center px-8 py-2 text-center text-sm font-medium lg:flex">
        <span className="drop-shadow-sm">{t("underConstruction")}</span>
      </p>
    </div>
  );
}
