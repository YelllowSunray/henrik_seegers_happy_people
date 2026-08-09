"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";

export function MembersWelcome() {
  const tr = useTranslations("members");
  const { profile } = useAuth();
  const trialing = profile?.subscriptionStatus === "trialing";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm text-ink-soft">{tr("welcome")}</p>
        {profile?.email && (
          <p className="mt-1 text-sm font-medium text-ink">{profile.email}</p>
        )}
      </div>
      {trialing && (
        <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold tracking-wide text-ink uppercase">
          {tr("trialBadge")}
        </span>
      )}
    </div>
  );
}
