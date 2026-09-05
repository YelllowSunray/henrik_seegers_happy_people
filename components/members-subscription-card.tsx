"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth-provider";
import { ManageSubscriptionButton, SubscriptionStatusLine } from "@/components/manage-subscription-button";
import { hasStripeSubscription } from "@/lib/membership";

export function MembersSubscriptionCard() {
  const tr = useTranslations("members");
  const { profile, isAdmin } = useAuth();
  const stripeSub = hasStripeSubscription(profile);

  if (isAdmin) return null;

  return (
    <section className="reveal border border-line bg-bg-deep/40 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {tr("subscription")}
          </p>
          <SubscriptionStatusLine className="mt-2" />
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            {stripeSub ? tr("subscriptionCardLead") : tr("subscriptionCardChoose")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ManageSubscriptionButton variant="primary" />
          {stripeSub ? (
            <Link
              href="/members/subscription"
              className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              {tr("subscriptionDetails")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
