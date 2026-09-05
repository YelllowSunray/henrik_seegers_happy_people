"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useClubActivity } from "@/components/club-activity-provider";
import type { ClubSection } from "@/lib/types";

const items: {
  section: ClubSection;
  href: string;
  labelKey: string;
  tone: "accent" | "gold";
}[] = [
  { section: "vlogs", href: "/members/vlogs", labelKey: "vlogs", tone: "accent" },
  {
    section: "seminars",
    href: "/members/seminars",
    labelKey: "seminars",
    tone: "gold",
  },
  {
    section: "quotes",
    href: "/members/quotes",
    labelKey: "quotes",
    tone: "accent",
  },
  {
    section: "teachings",
    href: "/members/teachings",
    labelKey: "teachings",
    tone: "gold",
  },
];

export function WhatsNewStrip() {
  const t = useTranslations("members");
  const { activity } = useClubActivity();

  const news = items
    .map((item) => ({ ...item, count: activity[item.section] }))
    .filter((item) => item.count > 0);

  if (news.length === 0) return null;

  return (
    <section className="reveal overflow-hidden border border-accent/25 bg-gradient-to-br from-accent/10 via-bg to-gold/10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-accent/15 px-5 py-4 md:px-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {t("whatsNew")}
          </p>
          <p className="font-display mt-1 text-2xl text-ink md:text-3xl">
            {t("whatsNewTitle", { count: activity.total })}
          </p>
        </div>
        <p className="max-w-sm text-sm text-ink-soft">{t("whatsNewLead")}</p>
      </div>
      <ul className="grid gap-px bg-accent/10 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <li key={item.section} className="bg-bg">
            <Link
              href={item.href}
              className="group flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-bg-deep md:px-6"
            >
              <span>
                <span className="block font-medium text-ink group-hover:text-accent">
                  {t(item.labelKey)}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  {t("newCountHint", { count: item.count })}
                </span>
              </span>
              <span
                className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-1 text-xs font-bold text-white ${
                  item.tone === "gold" ? "bg-gold text-ink" : "bg-accent"
                }`}
              >
                {item.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
