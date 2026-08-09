import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      },
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

  const stripe = getStripe();
  const db = getAdminDb();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const priceId = process.env.STRIPE_PRICE_ID!;

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
    success_url: `${appUrl}/nl/members?checkout=success`,
    cancel_url: `${appUrl}/nl/happy-people?checkout=cancel`,
    subscription_data: {
      trial_period_days: 30,
      metadata: { firebaseUid: user.uid },
    },
    metadata: { firebaseUid: user.uid },
  });

  return NextResponse.json({ url: session.url });
}
