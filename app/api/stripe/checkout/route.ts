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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let customerId: string | undefined;
  if (db) {
    const snap = await db.collection("members").doc(user.uid).get();
    customerId = snap.data()?.stripeCustomerId as string | undefined;
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/${localeCode}/members?checkout=success`,
    cancel_url: `${appUrl}/${localeCode}/happy-people?checkout=cancel`,
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { firebaseUid: user.uid, plan },
    },
    metadata: { firebaseUid: user.uid, plan },
  });

  if (db) {
    await db.collection("members").doc(user.uid).set(
      { membershipPlan: plan },
      { merge: true },
    );
  }

  return NextResponse.json({ url: session.url });
}
