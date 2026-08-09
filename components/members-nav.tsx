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
    <nav className="flex flex-wrap gap-2 border-b border-line pb-4">
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
            className={`rounded-full px-3 py-1.5 text-sm ${
              active
                ? "bg-accent text-white"
                : "border border-line text-ink-soft hover:text-ink"
            }`}
          >
            {key === "hub" ? t("hub") : t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
