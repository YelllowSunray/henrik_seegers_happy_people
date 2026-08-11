import type { MemberProfile } from "./types";
import { TRIAL_DAYS } from "./stripe-constants";

export { TRIAL_DAYS };

export function isActiveSubscription(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}

function stripeReadyForClient() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/** ISO end of the complimentary free week (app-side trial). */
export function computeTrialEndsAt(from = new Date()): string {
  return new Date(
    from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function trialEndsAtMs(
  profile: MemberProfile | null | undefined,
): number | null {
  if (!profile?.trialEndsAt) return null;
  const ms = new Date(profile.trialEndsAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Whole days remaining in the free week (0 if expired, null if no trial). */
export function trialDaysLeft(
  profile: MemberProfile | null | undefined,
): number | null {
  const end = trialEndsAtMs(profile);
  if (end == null) return null;
  const ms = end - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isAppTrialActive(
  profile: MemberProfile | null | undefined,
): boolean {
  if (!profile || profile.isAdmin) return false;
  if (profile.stripeSubscriptionId) return false;
  const end = trialEndsAtMs(profile);
  if (end == null) return false;
  return Date.now() < end;
}

/** Free week ended and no Stripe subscription yet — club content stays locked. */
export function isAppTrialExpired(
  profile: MemberProfile | null | undefined,
): boolean {
  if (!profile || profile.isAdmin) return false;
  if (profile.stripeSubscriptionId) return false;
  const end = trialEndsAtMs(profile);
  if (end == null) return false;
  return Date.now() >= end;
}

/** Has a Stripe-backed sub (paid or Stripe trial) — manage via portal, not new checkout. */
export function hasStripeSubscription(
  profile: MemberProfile | null | undefined,
): boolean {
  return Boolean(profile?.stripeSubscriptionId);
}

/** Chosen plan only counts once Stripe has a subscription (not during free week). */
export function membershipPlanLabel(
  profile: MemberProfile | null | undefined,
): "monthly" | "yearly" | null {
  if (!hasStripeSubscription(profile)) return null;
  const plan = profile?.membershipPlan;
  return plan === "monthly" || plan === "yearly" ? plan : null;
}

/** When Stripe publishable key is missing, any signed-in user can preview the club UI. */
export function hasMembershipAccess(
  profile: MemberProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  if (profile.subscriptionStatus === "active" && profile.stripeSubscriptionId) {
    return true;
  }
  if (profile.subscriptionStatus === "trialing") {
    if (profile.stripeSubscriptionId) return true;
    return isAppTrialActive(profile);
  }
  if (isAppTrialActive(profile)) return true;
  if (!stripeReadyForClient()) return true;
  return false;
}
