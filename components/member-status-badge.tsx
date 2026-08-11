"use client";

import { useTranslations } from "next-intl";
import {
  memberBillingMeta,
  memberDisplayName,
} from "@/lib/member-status";
import type { MemberProfile } from "@/lib/types";

export function MemberStatusBadge({
  profile,
  className = "",
}: {
  profile: MemberProfile | null | undefined;
  className?: string;
}) {
  const t = useTranslations("admin");
  const meta = memberBillingMeta(profile);
  if (!profile || profile.isAdmin) return null;

  const label =
    meta.kind === "trial"
      ? meta.daysLeft != null
        ? t("badgeTrialDays", { days: meta.daysLeft })
        : t("subscribersTrialShort")
      : meta.kind === "paid"
        ? meta.plan === "yearly"
          ? t("badgePaidYearly")
          : meta.plan === "monthly"
            ? t("badgePaidMonthly")
            : t("subscribersPaidShort")
        : profile.subscriptionStatus === "past_due"
          ? t("statusPastDue")
          : profile.subscriptionStatus === "canceled"
            ? t("statusCanceled")
            : t("badgeOther");

  const tone =
    meta.kind === "trial"
      ? "bg-gold/25 text-ink"
      : meta.kind === "paid"
        ? "bg-accent/15 text-accent"
        : "bg-bg-deep text-ink-soft";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${tone} ${className}`}
    >
      {label}
    </span>
  );
}

export function memberOptionLabel(
  profile: MemberProfile,
  labels: {
    trial: string;
    trialDays: (days: number) => string;
    paid: string;
    paidMonthly: string;
    paidYearly: string;
    other: string;
  },
): string {
  const name = memberDisplayName(profile);
  const email = profile.email?.trim();
  const primary = email && name !== email ? `${name} · ${email}` : name;
  const meta = memberBillingMeta(profile);
  const status =
    meta.kind === "trial"
      ? meta.daysLeft != null
        ? labels.trialDays(meta.daysLeft)
        : labels.trial
      : meta.kind === "paid"
        ? meta.plan === "yearly"
          ? labels.paidYearly
          : meta.plan === "monthly"
            ? labels.paidMonthly
            : labels.paid
        : labels.other;
  return `${primary} (${status})`;
}

export function MemberIdentity({
  profile,
  emailFallback,
  photoURL,
  size = "md",
}: {
  profile?: MemberProfile | null;
  emailFallback?: string;
  photoURL?: string;
  size?: "sm" | "md";
}) {
  const name = memberDisplayName(
    profile ?? { email: emailFallback ?? "", displayName: undefined },
  );
  const email = profile?.email || emailFallback;
  const showEmail = Boolean(email && name !== email);
  const photo = photoURL || profile?.photoURL;
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`relative ${box} shrink-0 overflow-hidden rounded-full border border-line bg-bg`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-ink-soft">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-ink">{name}</p>
          {profile && <MemberStatusBadge profile={profile} />}
        </div>
        {showEmail && (
          <p className="mt-0.5 truncate text-xs text-ink-soft">{email}</p>
        )}
      </div>
    </div>
  );
}
