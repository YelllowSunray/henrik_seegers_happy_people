"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function HomeVariantBanner() {
  const t = useTranslations("homeClient");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current =
    searchParams.get("variant") === "client" ? "client" : "classic";

  const classicHref = pathname;
  const clientHref = {
    pathname,
    query: { variant: "client" },
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-ink/90 px-2 py-2 text-sm text-white shadow-lg backdrop-blur-md"
      role="group"
      aria-label={t("variantBanner")}
    >
      <span className="hidden px-2 text-xs font-medium tracking-wide text-white/70 sm:inline">
        {t("variantBanner")}
      </span>
      <Link
        href={classicHref}
        className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
          current === "classic"
            ? "bg-white text-ink"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
        aria-current={current === "classic" ? "page" : undefined}
      >
        {t("variantClassic")}
      </Link>
      <Link
        href={clientHref}
        className={`rounded-full px-3 py-1.5 font-semibold transition-colors ${
          current === "client"
            ? "bg-accent text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`}
        aria-current={current === "client" ? "page" : undefined}
      >
        {t("variantClient")}
      </Link>
    </div>
  );
}
