"use client";

import { useLocale, useTranslations } from "next-intl";
import { quotes, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function MembersQuotesPage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;

  return (
    <div>
      <h1 className="font-display text-3xl">{tr("quotes")}</h1>
      <ul className="mt-8 space-y-6">
        {quotes.map((q) => (
          <li key={q.id} className="border-l-2 border-gold pl-5">
            <p className="font-display text-2xl leading-snug md:text-3xl">
              “{t(q.text, locale)}”
            </p>
            <p className="mt-3 text-xs text-ink-soft">{q.publishedAt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
