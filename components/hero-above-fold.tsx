"use client";

import { type ReactNode } from "react";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { HeroPromoColumn } from "@/components/hero-promo-column";

type HeroCopy = {
  brand: string;
  headline: string;
  support: string;
  ctaJoin: string;
  ctaSeminar: string;
};

export function HeroAboveFold({
  hero,
  children,
}: {
  hero: HeroCopy;
  children: ReactNode;
}) {
  const cms = useCmsOptional();
  const playerWrap =
    "w-full shrink-0 lg:ml-auto lg:w-auto lg:max-w-[41rem]";

  if (cms?.enabled) {
    return (
      <div className="relative mx-auto flex min-h-[100svh] w-full flex-col justify-end gap-4 px-5 pb-8 pt-[calc(var(--site-header-h,6.5rem)+0.75rem)] sm:gap-8 sm:pb-16 md:px-8 md:pb-24 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-10 xl:px-14">
        <div className="min-w-0 max-w-6xl lg:max-w-xl xl:max-w-2xl">
          <HeroPromoColumn hero={hero} />
        </div>
        <div className={playerWrap}>{children}</div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[100svh] w-full flex-col justify-end gap-4 px-5 pb-8 pt-[calc(var(--site-header-h,6.5rem)+0.75rem)] sm:gap-8 sm:pb-16 md:px-8 md:pb-24 lg:px-10 xl:px-14">
      <div className={`${playerWrap} max-w-[41rem] sm:max-w-none lg:max-w-[48rem]`}>
        {children}
      </div>
    </div>
  );
}
