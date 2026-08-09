"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  ["", "hub"],
  ["/seminars", "seminars"],
  ["/vlogs", "vlogs"],
  ["/quotes", "quotes"],
  ["/messages", "messages"],
  ["/teachings", "teachings"],
] as const;

export function MembersNav() {
  const t = useTranslations("members");
  const pathname = usePathname();

  return (
    <nav className="-mx-1 overflow-x-auto border-b border-line pb-4">
      <div className="flex w-max min-w-full flex-nowrap gap-2 px-1 sm:flex-wrap sm:w-auto">
        {links.map(([suffix, key]) => {
          const href = `/members${suffix}`;
          const active =
            suffix === ""
              ? pathname === "/members"
              : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm ${
                active
                  ? "bg-accent text-white"
                  : "border border-line text-ink-soft hover:text-ink"
              }`}
            >
              {key === "hub" ? t("hub") : t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
