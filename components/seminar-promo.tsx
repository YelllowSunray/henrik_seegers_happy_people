"use client";

import { useTranslations } from "next-intl";
import { CmsField } from "@/components/cms/cms-field";
import { useCmsOptional, useCmsValue } from "@/components/cms/cms-provider";

export function SeminarPromoBar({
  onHero,
  scrolled,
  cmsMode,
}: {
  onHero: boolean;
  scrolled: boolean;
  cmsMode: boolean;
}) {
  const t = useTranslations("site");
  const cms = useCmsOptional();
  const banner = useCmsValue("site.banner", t("underConstruction"));

  const dark = onHero || scrolled || cmsMode;

  return (
    <div
      className={
        dark
          ? "border-t border-white/15 bg-black/80 text-white"
          : "border-t border-line bg-bg-deep text-ink"
      }
    >
      <div className="mx-auto max-w-7xl px-5 py-2.5 md:px-8">
        {cms?.enabled ? (
          <CmsField
            path="site.banner"
            value={banner}
            multiline={false}
            className={`w-full text-center text-sm font-medium leading-snug sm:text-base ${
              dark ? "bg-transparent text-white" : "bg-transparent text-ink"
            }`}
          />
        ) : (
          <p className="text-center text-sm font-medium leading-snug sm:text-base">
            {banner}
          </p>
        )}
      </div>
    </div>
  );
}
