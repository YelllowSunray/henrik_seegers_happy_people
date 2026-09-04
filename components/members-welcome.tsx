"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { useClubActivity } from "@/components/club-activity-provider";
import { DonateButton } from "@/components/donate-button";
import { profileDisplayName } from "@/lib/profile";

export function MembersWelcome() {
  const tr = useTranslations("members");
  const tDonate = useTranslations("donate");
  const { profile } = useAuth();
  const { activity } = useClubActivity();
  const name = profileDisplayName(profile);

  return (
    <div className="reveal space-y-6 border-b border-line pb-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold tracking-wide text-accent uppercase">
              <span
                className="h-1.5 w-1.5 rounded-full bg-accent"
                aria-hidden
              />
              {tr("memberBadge")}
            </span>
            {activity.total > 0 && (
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase">
                {tr("newBadge", { count: activity.total })}
              </span>
            )}
          </div>
          <p className="font-display mt-3 text-3xl text-ink md:text-5xl">
            {name ? `${tr("welcome")}, ${name}` : tr("welcome")}
          </p>
          <p className="mt-2 max-w-lg text-sm text-ink-soft md:text-base">
            {activity.total > 0 ? tr("welcomeNewLead") : tr("welcomeLead")}
          </p>
        </div>
        <div className="shrink-0 sm:pt-1">
          <p className="mb-2 text-xs text-ink-soft sm:text-right">
            {tDonate("membersHint")}
          </p>
          <div className="sm:flex sm:justify-end">
            <DonateButton variant="compact" returnPath="/members" />
          </div>
        </div>
      </div>
    </div>
  );
}
