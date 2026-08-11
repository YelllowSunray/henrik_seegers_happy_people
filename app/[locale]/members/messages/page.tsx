"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { t } from "@/lib/content";
import type { Locale, PersonalMessage } from "@/lib/types";

function formatCreatedAt(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date })
      .toDate()
      .toISOString()
      .slice(0, 10);
  }
  return String(value ?? "");
}

export default function MembersMessagesPage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setMessages([]);
      setReady(true);
      return;
    }

    return onSnapshot(
      query(
        collection(getClientDb(), "personalMessages"),
        where("toUserId", "==", user.uid),
      ),
      (snap) => {
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              toUserId: String(data.toUserId ?? ""),
              toEmail: data.toEmail as string | undefined,
              subject: data.subject ?? { nl: "" },
              body: data.body ?? { nl: "" },
              createdAt: formatCreatedAt(data.createdAt),
              read: Boolean(data.read),
            } as PersonalMessage;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setMessages(rows);
        setReady(true);
      },
      () => {
        setMessages([]);
        setReady(true);
      },
    );
  }, [user]);

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("inside")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{tr("messages")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{tr("descMessages")}</p>
      {!ready ? (
        <p className="mt-10 text-ink-soft">…</p>
      ) : messages.length === 0 ? (
        <p className="mt-10 text-ink-soft">{tr("emptyInbox")}</p>
      ) : (
        <ul className="mt-10 space-y-5">
          {messages.map((m) => (
            <li
              key={m.id}
              className="border border-line bg-bg-deep/40 p-6 md:p-8"
            >
              <p className="text-xs tracking-wide text-ink-soft uppercase">
                {m.createdAt}
              </p>
              <h2 className="font-display mt-2 text-2xl md:text-3xl">
                {t(m.subject, locale)}
              </h2>
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-soft">
                {t(m.body, locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
