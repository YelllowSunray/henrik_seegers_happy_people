import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Pulls the latest Stripe subscription for the signed-in member into Firestore.
 * Used after checkout success when webhooks may be delayed locally.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const user = await verifyBearerUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin not configured." },
      { status: 503 },
    );
  }

  const ref = db.collection("members").doc(user.uid);
  const snap = await ref.get();
  let customerId = snap.data()?.stripeCustomerId as string | undefined;

  const stripe = getStripe();

  if (!customerId) {
    const customers = await stripe.customers.list({
      email: user.email ?? undefined,
      limit: 5,
    });
    const match =
      customers.data.find((c) => c.metadata?.firebaseUid === user.uid) ||
      customers.data[0];
    if (match) {
      customerId = match.id;
      await ref.set(
        {
          uid: user.uid,
          email: user.email,
          stripeCustomerId: customerId,
        },
        { merge: true },
      );
    }
  }

  if (!customerId) {
    return NextResponse.json({
      subscriptionStatus: snap.data()?.subscriptionStatus ?? "none",
      synced: false,
    });
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const preferred =
    subs.data.find((s) => s.status === "active" || s.status === "trialing") ||
    subs.data.find((s) => s.status === "past_due") ||
    subs.data[0];

  if (!preferred) {
    await ref.set(
      {
        stripeCustomerId: customerId,
        subscriptionStatus: "none",
      },
      { merge: true },
    );
    return NextResponse.json({
      subscriptionStatus: "none",
      synced: true,
    });
  }

  const priceId = preferred.items.data[0]?.price?.id;
  const monthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_ID_YEARLY;
  let membershipPlan: "monthly" | "yearly" | undefined;
  if (priceId && yearly && priceId === yearly) membershipPlan = "yearly";
  else if (priceId && monthly && priceId === monthly) membershipPlan = "monthly";
  else if (preferred.metadata?.plan === "yearly") membershipPlan = "yearly";
  else if (preferred.metadata?.plan === "monthly") membershipPlan = "monthly";

  if (!preferred.metadata?.firebaseUid) {
    await stripe.subscriptions.update(preferred.id, {
      metadata: {
        ...preferred.metadata,
        firebaseUid: user.uid,
        ...(membershipPlan ? { plan: membershipPlan } : {}),
      },
    });
  }

  await ref.set(
    {
      stripeCustomerId: customerId,
      stripeSubscriptionId: preferred.id,
      subscriptionStatus: preferred.status,
      ...(membershipPlan ? { membershipPlan } : {}),
    },
    { merge: true },
  );

  return NextResponse.json({
    subscriptionStatus: preferred.status,
    membershipPlan: membershipPlan ?? null,
    synced: true,
  });
}
