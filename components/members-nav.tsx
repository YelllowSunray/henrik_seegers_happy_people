"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useClubActivity } from "@/components/club-activity-provider";
import type { ClubSection } from "@/lib/types";

const links = [
  ["", "hub", null],
  ["/seminars", "seminars", "seminars"],
  ["/vlogs", "vlogs", "vlogs"],
  ["/quotes", "quotes", "quotes"],
  ["/teachings", "teachings", "teachings"],
] as const satisfies ReadonlyArray<
  readonly [string, string, ClubSection | null]
>;

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function MembersNav() {
  const t = useTranslations("members");
  const pathname = usePathname();
  const { activity } = useClubActivity();

  return (
    <nav className="-mx-1 overflow-x-auto">
      <div className="flex w-max min-w-full gap-1 border-b border-line px-1 sm:w-auto sm:flex-wrap">
        {links.map(([suffix, key, section]) => {
          const href = `/members${suffix}`;
          const active =
            suffix === ""
              ? pathname === "/members"
              : pathname.startsWith(href);
          const count = section ? activity[section] : 0;
          return (
            <Link
              key={key}
              href={href}
              className={`relative shrink-0 border-b-2 px-3.5 py-3 text-sm transition ${
                active
                  ? "-mb-px border-accent font-semibold text-accent"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              <span className="inline-flex items-center">
                {key === "hub" ? t("home") : t(key)}
                <Badge count={count} />
              </span>
              {count > 0 && !active && (
                <span className="absolute top-2 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
