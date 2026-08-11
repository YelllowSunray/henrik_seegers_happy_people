"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useClubActivity } from "@/components/club-activity-provider";

export function ClubChatFab() {
  const t = useTranslations("members");
  const { activity } = useClubActivity();
  const unread = activity.chat;

  return (
    <Link
      href="/members/chat"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-ink/20 transition hover:bg-accent md:right-8"
    >
      <span className="relative">
        <span aria-hidden>✦</span>
        {unread > 0 && (
          <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold">
            {unread}
          </span>
        )}
      </span>
      {unread > 0 ? t("chatUnreadFab") : t("chatFab")}
    </Link>
  );
}
