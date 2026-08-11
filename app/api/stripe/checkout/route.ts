import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { billingContactMessage } from "@/lib/billing";
import { fetchBillingState } from "@/lib/content-firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  getPriceIdForPlan,
  getStripe,
  isStripeConfigured,
  parseMembershipPlan,
  paymentMethodsForLocale,
  stripeCheckoutLocale,
  TRIAL_DAYS,
  type MembershipPlan,
} from "@/lib/stripe";

function localeFromReferer(req: Request) {
  const referer = req.headers.get("referer") || "";
  const match = referer.match(/\/(nl|en|de|es|it|fr|ko)(\/|$)/);
  return match?.[1] ?? "nl";
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      },
      { status: 503 },
    );
  }

  const billing = await fetchBillingState();
  if (billing.overBudget) {
    return NextResponse.json(
      { error: billingContactMessage() },
      { status: 503 },
    );
  }

  const user = await verifyBearerUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized — sign in and ensure Firebase Admin is configured." },
      { status: 401 },
    );
  }

  let plan: MembershipPlan = "monthly";
  let localeCode = localeFromReferer(req);
  try {
    const body = (await req.json()) as { plan?: string; locale?: string };
    plan = parseMembershipPlan(body.plan);
    if (body.locale && /^[a-z]{2}$/.test(body.locale)) {
      localeCode = body.locale;
    }
  } catch {
    plan = "monthly";
  }

  const priceId = getPriceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price missing for plan: ${plan}` },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const db = getAdminDb();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

  let customerId: string | undefined;
  let trialEndsAt: string | undefined;
  if (db) {
    const snap = await db.collection("members").doc(user.uid).get();
    const data = snap.data() ?? {};
    customerId = data.stripeCustomerId as string | undefined;
    trialEndsAt = data.trialEndsAt as string | undefined;
    const status = data.subscriptionStatus as string | undefined;
    const stripeSubId = data.stripeSubscriptionId as string | undefined;

    // Already on a Stripe subscription — use the billing portal instead.
    if (stripeSubId && (status === "active" || status === "trialing")) {
      return NextResponse.json(
        {
          error:
            "You already have an active membership. Manage it from the subscription page.",
          code: "already_subscribed",
        },
        { status: 409 },
      );
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { firebaseUid: user.uid },
    });
    customerId = customer.id;
    if (db) {
      await db.collection("members").doc(user.uid).set(
        {
          uid: user.uid,
          email: user.email,
          stripeCustomerId: customerId,
        },
        { merge: true },
      );
    }
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const appTrialEndSec = trialEndsAt
    ? Math.floor(new Date(trialEndsAt).getTime() / 1000)
    : nowSec + TRIAL_DAYS * 24 * 60 * 60;
  // Stripe requires trial_end at least ~48h ahead; otherwise charge after checkout.
  const minTrialEnd = nowSec + 48 * 60 * 60;
  const useTrialEnd = appTrialEndSec >= minTrialEnd;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    locale: stripeCheckoutLocale(localeCode),
    payment_method_types: paymentMethodsForLocale(localeCode),
    // Collect payment details when choosing a paid plan (charged after free days).
    payment_method_collection: "always",
    success_url: `${appUrl}/${localeCode}/members/subscription?checkout=success`,
    cancel_url: `${appUrl}/${localeCode}/members/subscription?checkout=cancel`,
    subscription_data: {
      ...(useTrialEnd
        ? { trial_end: appTrialEndSec }
        : appTrialEndSec > nowSec
          ? { trial_period_days: 1 }
          : {}),
      metadata: { firebaseUid: user.uid, plan },
    },
    metadata: { firebaseUid: user.uid, plan },
  });

  // Do not write membershipPlan until Stripe confirms the subscription
  // (webhook / sync). Otherwise abandoned checkouts look like a chosen plan.

  return NextResponse.json({ url: session.url });
}
