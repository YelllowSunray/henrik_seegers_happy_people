"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";
import {
  hasStripeSubscription,
  membershipPlanLabel,
} from "@/lib/membership";
import { openStripePortal } from "@/lib/open-stripe-portal";

type Variant = "primary" | "secondary" | "compact";

const styles: Record<Variant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:bg-bg disabled:opacity-60",
  compact:
    "inline-flex items-center justify-center rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60",
};

export function ManageSubscriptionButton({
  variant = "primary",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const tr = useTranslations("members");
  const locale = useLocale();
  const { user, profile, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const stripeSub = hasStripeSubscription(profile);
  const shell = `${styles[variant]} ${className}`.trim();

  if (isAdmin) {
    return (
      <Link href="/admin" className={shell}>
        {tr("adminAccessLink")}
      </Link>
    );
  }

  if (!user) {
    return (
      <Link href="/members/subscription" className={shell}>
        {tr("manageBilling")}
      </Link>
    );
  }

  if (stripeSub) {
    return (
      <button
        type="button"
        disabled={busy}
        className={shell}
        onClick={() => {
          setBusy(true);
          void openStripePortal(() => user.getIdToken(), locale).catch(() => {
            setBusy(false);
            window.location.href = `/${locale}/members/subscription`;
          });
        }}
      >
        {busy ? "…" : tr("changeSubscription")}
      </button>
    );
  }

  return (
    <Link href="/members/subscription" className={shell}>
      {tr("chooseSubscription")}
    </Link>
  );
}

export function SubscriptionStatusLine({ className = "" }: { className?: string }) {
  const tr = useTranslations("members");
  const tMem = useTranslations("membership");
  const tSub = useTranslations("subscription");
  const { profile, isAdmin } = useAuth();
  const stripeSub = hasStripeSubscription(profile);
  const plan = membershipPlanLabel(profile);

  if (isAdmin) return null;

  const planLabel =
    plan === "yearly"
      ? tMem("yearlyLabel")
      : plan === "monthly"
        ? tMem("monthlyLabel")
        : null;

  const status = profile?.subscriptionStatus ?? "none";
  const statusLabel =
    status === "active" || status === "trialing"
      ? tSub("statusActive")
      : status === "past_due"
        ? tSub("statusPastDue")
        : status === "canceled"
          ? tSub("statusCanceled")
          : tSub("statusNone");

  if (stripeSub && planLabel) {
    return (
      <p className={`text-xs text-ink-soft ${className}`.trim()}>
        {tr("subscriptionSummary", { plan: planLabel, status: statusLabel })}
      </p>
    );
  }

  if (!stripeSub) {
    return (
      <p className={`text-xs text-ink-soft ${className}`.trim()}>
        {tr("subscriptionNone")}
      </p>
    );
  }

  return null;
}
