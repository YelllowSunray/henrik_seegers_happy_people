"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";

type Section = "blog" | "vlogs";

export function JournalNav({
  active,
  newHref,
}: {
  active: Section;
  /** Extra admin entry point, e.g. #nieuwe-blog */
  newHref?: string;
}) {
  const t = useTranslations("journal");
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const onBlog = active === "blog" || pathname.startsWith("/blog");
  const onVlogs = active === "vlogs" || pathname.startsWith("/vlogs");

  return (
    <nav
      aria-label={t("sections")}
      className="sticky top-[calc(4.25rem+env(safe-area-inset-top)+var(--seminar-promo-h,0px))] z-20 -mx-5 mb-8 border-b border-line bg-bg/95 px-5 backdrop-blur-md md:-mx-8 md:px-8"
    >
      <div className="flex items-center gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/blog"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
            onBlog
              ? "bg-ink text-white"
              : "border border-line text-ink-soft hover:border-ink/30 hover:text-ink"
          }`}
        >
          {t("blog")}
        </Link>
        <Link
          href="/vlogs"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
            onVlogs
              ? "bg-ink text-white"
              : "border border-line text-ink-soft hover:border-ink/30 hover:text-ink"
          }`}
        >
          {t("vlogs")}
        </Link>
        {newHref && isAdmin ? (
          <a
            href={newHref}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white"
          >
            {onVlogs ? t("newVlog") : t("newBlog")}
          </a>
        ) : null}
      </div>
    </nav>
  );
}

export function JournalChips({
  items,
}: {
  items: { id: string; label: string; href: string; active: boolean }[];
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="list"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          scroll={false}
          className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-medium transition ${
            item.active
              ? "bg-accent text-white"
              : "border border-line bg-white/60 text-ink-soft hover:border-accent/40 hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
