"use client";

import { CmsField } from "@/components/cms/cms-field";
import { CmsHeroCtas } from "@/components/cms/cms-hero-ctas";
import { useCmsOptional } from "@/components/cms/cms-provider";

type HeroCopy = {
  brand: string;
  headline: string;
  support: string;
  ctaJoin: string;
  ctaSeminar: string;
};

/**
 * Hero headline / CTAs are still editable in CMS preview, but hidden for
 * public visitors to keep the first screen uncluttered (soft-launch).
 */
export function HeroPromoColumn({ hero }: { hero: HeroCopy }) {
  const cms = useCmsOptional();
  if (!cms?.enabled) return null;

  return (
    <>
      <CmsField
        path="hero.brand"
        value={hero.brand}
        as="p"
        multiline={false}
        className="reveal font-display text-4xl leading-[1.05] text-white drop-shadow sm:text-5xl md:text-7xl lg:text-8xl"
      />
      <CmsField
        path="hero.headline"
        value={hero.headline}
        as="h1"
        className="reveal reveal-delay-1 mt-1 max-w-xl text-balance text-lg leading-snug text-white sm:mt-4 sm:text-xl md:text-2xl lg:text-[1.65rem]"
      />
      <CmsField
        path="hero.support"
        value={hero.support}
        as="p"
        className="reveal reveal-delay-2 mt-1 max-w-md text-base leading-snug text-white/90 sm:mt-3 sm:text-lg"
      />
      <CmsHeroCtas ctaJoin={hero.ctaJoin} ctaSeminar={hero.ctaSeminar} />
    </>
  );
}
