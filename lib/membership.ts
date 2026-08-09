import { isActiveSubscription } from "./stripe";
import type { MemberProfile } from "./types";

function stripeReadyForClient() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

/** When Stripe publishable key is missing, any signed-in user can preview the club UI. */
export function hasMembershipAccess(
  profile: MemberProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.isAdmin) return true;
  if (isActiveSubscription(profile.subscriptionStatus)) return true;
  if (!stripeReadyForClient()) return true;
  return false;
}
