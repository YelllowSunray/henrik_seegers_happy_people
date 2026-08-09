"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { samplePersonalMessages, t } from "@/lib/content";
import type { Locale, PersonalMessage } from "@/lib/types";

export default function MembersMessagesPage() {
  const tr = useTranslations("members");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const [messages, setMessages] = useState<PersonalMessage[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !user?.email) {
      setMessages(
        samplePersonalMessages.map((m) => ({
          ...m,
          toEmail: user?.email ?? undefined,
        })),
      );
      return;
    }

    const email = user.email.toLowerCase();
    return onSnapshot(collection(getClientDb(), "personalMessages"), (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            toUserId: String(data.toUserId ?? ""),
            toEmail: data.toEmail as string | undefined,
            subject: data.subject ?? { nl: "" },
            body: data.body ?? { nl: "" },
            createdAt: String(data.createdAt ?? ""),
            read: Boolean(data.read),
          } as PersonalMessage;
        })
        .filter(
          (m) =>
            m.toEmail?.toLowerCase() === email ||
            m.toUserId === user.uid,
        );
      setMessages(
        rows.length > 0
          ? rows
          : samplePersonalMessages.map((m) => ({
              ...m,
              toEmail: user.email ?? undefined,
            })),
      );
    });
  }, [user]);

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
