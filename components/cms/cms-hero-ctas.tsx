"use client";

import { JoinButton } from "@/components/join-button";
import { CmsField } from "@/components/cms/cms-field";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { Link } from "@/i18n/navigation";

export function CmsHeroCtas({
  ctaJoin,
  ctaSeminar,
}: {
  ctaJoin: string;
  ctaSeminar: string;
}) {
  const cms = useCmsOptional();
  if (cms?.enabled) {
    return (
      <div className="reveal reveal-delay-3 mt-3 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
        <CmsField
          path="hero.ctaJoin"
          value={ctaJoin}
          multiline={false}
          nowrap
          className="rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold text-white sm:px-6 sm:py-3"
        />
        <CmsField
          path="hero.ctaSeminar"
          value={ctaSeminar}
          multiline={false}
          nowrap
          className="rounded-full border border-white/40 px-5 py-2.5 text-center text-sm font-semibold text-white backdrop-blur sm:px-6 sm:py-3"
        />
      </div>
    );
  }

  return (
    <div className="reveal reveal-delay-3 mt-3 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
      <JoinButton
        label={ctaJoin}
        className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft sm:px-6 sm:py-3"
      />
      <Link
        href="/seminars"
        className="inline-flex rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 sm:px-6 sm:py-3"
      >
        {ctaSeminar}
      </Link>
    </div>
  );
}
