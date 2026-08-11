import {
  hasStripeSubscription,
  isAppTrialActive,
  membershipPlanLabel,
  trialDaysLeft,
} from "@/lib/membership";
import type { MemberProfile } from "@/lib/types";

export type MemberBillingKind = "trial" | "paid" | "other";

export function memberDisplayName(
  profile: Pick<MemberProfile, "displayName" | "email"> | null | undefined,
): string {
  const name = profile?.displayName?.trim();
  if (name) return name;
  return profile?.email?.trim() || "—";
}

export function memberBillingKind(
  profile: MemberProfile | null | undefined,
): MemberBillingKind {
  if (!profile || profile.isAdmin) return "other";
  if (profile.subscriptionStatus === "active") return "paid";
  if (isAppTrialActive(profile)) return "trial";
  if (profile.subscriptionStatus === "trialing" && hasStripeSubscription(profile)) {
    return "trial";
  }
  return "other";
}

export function memberBillingMeta(profile: MemberProfile | null | undefined): {
  kind: MemberBillingKind;
  daysLeft: number | null;
  plan: "monthly" | "yearly" | null;
  hasStripe: boolean;
} {
  return {
    kind: memberBillingKind(profile),
    daysLeft: trialDaysLeft(profile),
    plan: membershipPlanLabel(profile),
    hasStripe: hasStripeSubscription(profile),
  };
}
