"use client";

import { useTranslations } from "next-intl";
import { CmsField } from "@/components/cms/cms-field";
import { useCmsOptional, useCmsValue } from "@/components/cms/cms-provider";

/**
 * Slim site notice, same for visitors and admin.
 * On a hero: no fill of its own — it rides the header chrome
 * (translucent at top, solid after scroll on desktop).
 * On inner pages: a warm green tint until the header goes dark.
 */
export function SeminarPromoBar({
  onHero,
  scrolled = false,
}: {
  onHero: boolean;
  scrolled?: boolean;
}) {
  const t = useTranslations("site");
  const cms = useCmsOptional();
  const banner = useCmsValue("site.banner", t("underConstruction"));
  const editing = Boolean(cms?.enabled);
  const onDark = onHero || scrolled;

  return (
    <div
      className={
        onDark
          ? "border-t border-white/15"
          : "border-t border-[color-mix(in_srgb,var(--accent)_18%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--bg))]"
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-1.5 md:px-8">
        <span
          aria-hidden
          className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${
            onDark ? "bg-gold" : "bg-accent"
          }`}
        />
        {editing ? (
          <CmsField
            path="site.banner"
            value={banner}
            multiline={false}
            className={`w-full bg-transparent text-center text-xs font-medium tracking-wide sm:text-sm ${
              onDark ? "text-white" : "text-accent"
            }`}
          />
        ) : (
          <p
            className={`truncate text-center text-xs font-medium tracking-wide sm:text-sm ${
              onDark ? "text-white/95" : "text-accent"
            }`}
          >
            {banner}
          </p>
        )}
      </div>
    </div>
  );
}
