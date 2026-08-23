"use client";

import { useTranslations } from "next-intl";

const clientHomeNav = [
  ["message", "boodschap"],
  ["about", "over-henk"],
  ["meeting", "ontmoeting"],
  ["seminars", "seminars"],
  ["journey", "reis"],
  ["blog", "blog"],
  ["twinFlames", "twin-flames"],
  ["membership", "lidmaatschap"],
  ["donate", "steun"],
  ["happyPeople", "happy-people"],
] as const;

export function ClientHomeMobileNav({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const t = useTranslations("homeClient.nav");

  return (
    <>
      {clientHomeNav.map(([key, sectionId]) => (
        <a
          key={sectionId}
          href={`#${sectionId}`}
          className="rounded-lg px-3 py-3.5 text-lg font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          onClick={onNavigate}
        >
          {t(key)}
        </a>
      ))}
    </>
  );
}
