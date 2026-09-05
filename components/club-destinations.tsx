"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useClubActivity } from "@/components/club-activity-provider";
import type { ClubSection } from "@/lib/types";

type Destination = {
  href: string;
  label: string;
  desc: string;
  count: number | null;
  tone: "accent" | "gold";
  section?: ClubSection;
};

export function ClubDestinations({ items }: { items: Destination[] }) {
  const tr = useTranslations("members");
  const { activity } = useClubActivity();

  return (
    <div className="mt-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => {
        const fresh = d.section ? activity[d.section] : 0;
        return (
          <Link
            key={d.href}
            href={d.href}
            className="group relative flex min-h-[10.5rem] flex-col justify-between bg-bg p-5 transition hover:bg-bg-deep md:p-6"
          >
            {fresh > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                {tr("new")}
              </span>
            )}
            <div>
              <div className="flex items-start justify-between gap-3 pr-10">
                <h3 className="font-display text-2xl text-ink group-hover:text-accent">
                  {d.label}
                </h3>
                {d.count != null && (
                  <span
                    className={`text-xs font-semibold tracking-wide ${
                      d.tone === "gold" ? "text-gold" : "text-accent"
                    }`}
                  >
                    {tr("count", { count: d.count })}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {d.desc}
              </p>
              {fresh > 0 && (
                <p className="mt-3 text-xs font-semibold text-accent">
                  {tr("newCountHint", { count: fresh })}
                </p>
              )}
            </div>
            <span
              className={`mt-6 text-sm font-semibold ${
                d.tone === "gold" ? "text-gold" : "text-accent"
              }`}
            >
              {tr("open")} →
            </span>
          </Link>
        );
      })}
    </div>
  );
}
