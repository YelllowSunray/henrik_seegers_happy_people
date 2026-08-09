"use client";

import { useLocale, useTranslations } from "next-intl";
import { samplePersonalMessages, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default function MembersMessagesPage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;
  const messages = samplePersonalMessages;

  return (
    <div>
      <h1 className="font-display text-3xl">{tr("messages")}</h1>
      {messages.length === 0 ? (
        <p className="mt-6 text-ink-soft">{tr("emptyInbox")}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="border border-line bg-bg/70 p-5">
              <p className="text-xs text-ink-soft">{m.createdAt}</p>
              <h2 className="font-display mt-2 text-2xl">
                {t(m.subject, locale)}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-ink-soft">
                {t(m.body, locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
