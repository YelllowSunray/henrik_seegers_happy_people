"use client";

import { useAuth } from "@/components/auth-provider";
import { ChatWindow } from "@/components/chat-window";
import { useTranslations } from "next-intl";

export function MemberChat() {
  const { user } = useAuth();
  const t = useTranslations("chat");

  if (!user) {
    return <p className="text-ink-soft">{t("signIn")}</p>;
  }

  return (
    <ChatWindow
      memberUid={user.uid}
      viewerRole="member"
      emptyHint={t("emptyMember")}
    />
  );
}
