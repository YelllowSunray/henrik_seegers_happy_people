import Stripe from "stripe";

export type MembershipPlan = "monthly" | "yearly";

export const TRIAL_DAYS = 7;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
  });
}

export function getPriceIdForPlan(plan: MembershipPlan): string | undefined {
  if (plan === "yearly") {
    return (
      process.env.STRIPE_PRICE_ID_YEARLY ||
      process.env.STRIPE_PRICE_ID ||
      undefined
    );
  }
  return (
    process.env.STRIPE_PRICE_ID_MONTHLY ||
    process.env.STRIPE_PRICE_ID ||
    undefined
  );
}

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      (process.env.STRIPE_PRICE_ID_MONTHLY ||
        process.env.STRIPE_PRICE_ID_YEARLY ||
        process.env.STRIPE_PRICE_ID),
  );
}

/** Active membership includes trial period */
export function isActiveSubscription(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}

export function parseMembershipPlan(value: unknown): MembershipPlan {
  return value === "yearly" ? "yearly" : "monthly";
}
