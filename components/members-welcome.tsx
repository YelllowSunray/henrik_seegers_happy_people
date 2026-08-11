"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";
import { useClubActivity } from "@/components/club-activity-provider";
import { DonateButton } from "@/components/donate-button";
import { profileDisplayName } from "@/lib/profile";
import {
  hasStripeSubscription,
  isAppTrialActive,
  trialDaysLeft,
} from "@/lib/membership";

export function MembersWelcome() {
  const tr = useTranslations("members");
  const tDonate = useTranslations("donate");
  const { profile } = useAuth();
  const { activity } = useClubActivity();
  const daysLeft = trialDaysLeft(profile);
  const appTrial = isAppTrialActive(profile);
  const stripeSub = hasStripeSubscription(profile);
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
            {appTrial && daysLeft != null && (
              <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-semibold tracking-wide text-ink uppercase">
                {tr("trialDaysLeft", { days: daysLeft })}
              </span>
            )}
            {stripeSub && profile?.subscriptionStatus === "trialing" && (
              <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-semibold tracking-wide text-ink uppercase">
                {tr("trialBadge")}
              </span>
            )}
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
            {appTrial
              ? tr("trialWelcomeLead", { days: daysLeft ?? 0 })
              : activity.total > 0
                ? tr("welcomeNewLead")
                : tr("welcomeLead")}
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

      {appTrial && !stripeSub && (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-gold/40 bg-gold/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">
              {tr("trialBannerTitle", { days: daysLeft ?? 0 })}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{tr("trialBannerLead")}</p>
          </div>
          <Link
            href="/members/subscription"
            className="inline-flex shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft"
          >
            {tr("trialChoosePlan")}
          </Link>
        </div>
      )}
    </div>
  );
}
