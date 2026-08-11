import Stripe from "stripe";

export { isActiveSubscription, TRIAL_DAYS } from "./membership";

export type MembershipPlan = "monthly" | "yearly";

/** Dominant local methods + card fallback. Must be enabled in Stripe Dashboard. */
export type CheckoutPaymentMethod =
  Stripe.Checkout.SessionCreateParams.PaymentMethodType;

const PAYMENT_METHODS_BY_LOCALE: Record<string, CheckoutPaymentMethod[]> = {
  // Netherlands — iDEAL first; SEPA for renewals after iDEAL mandate
  nl: ["ideal", "sepa_debit", "card"],
  // Germany — SEPA + card
  de: ["sepa_debit", "card"],
  // France / Spain / Italy — cards dominate, SEPA for bank debit
  fr: ["card", "sepa_debit"],
  es: ["card", "sepa_debit"],
  it: ["card", "sepa_debit"],
  // English / Korea — cards
  en: ["card"],
  ko: ["card"],
};

export function paymentMethodsForLocale(
  locale: string,
): CheckoutPaymentMethod[] {
  return PAYMENT_METHODS_BY_LOCALE[locale] ?? ["card"];
}

/** Stripe Checkout UI locale (falls back to auto). */
export function stripeCheckoutLocale(
  locale: string,
): Stripe.Checkout.SessionCreateParams.Locale {
  const allowed = new Set(["nl", "en", "de", "es", "fr", "it", "ko"]);
  if (allowed.has(locale)) {
    return locale as Stripe.Checkout.SessionCreateParams.Locale;
  }
  return "auto";
}

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

/** One-time donations only need the secret key (amounts use price_data). */
export function isStripeDonateConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Payment methods for one-time donations (no SEPA mandate flow). */
export function donationPaymentMethodsForLocale(
  locale: string,
): CheckoutPaymentMethod[] {
  if (locale === "nl") return ["ideal", "card"];
  return ["card"];
}

export const DONATION_PRESETS_EUR = [5, 10, 25, 50] as const;
export const DONATION_DEFAULT_EUR = 10;
export const DONATION_MIN_CENTS = 200;
export const DONATION_MAX_CENTS = 50_000;

export function parseDonationAmountCents(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return DONATION_DEFAULT_EUR * 100;
  const cents = Math.round(n);
  if (cents < DONATION_MIN_CENTS) return DONATION_MIN_CENTS;
  if (cents > DONATION_MAX_CENTS) return DONATION_MAX_CENTS;
  return cents;
}


export function parseMembershipPlan(value: unknown): MembershipPlan {
  return value === "yearly" ? "yearly" : "monthly";
}
