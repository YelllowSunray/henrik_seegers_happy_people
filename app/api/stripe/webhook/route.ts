import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function upsertMemberFromSubscription(sub: Stripe.Subscription) {
  const db = getAdminDb();
  if (!db) return;

  const uid =
    sub.metadata.firebaseUid ||
    (typeof sub.customer === "string"
      ? (
          await db
            .collection("members")
            .where("stripeCustomerId", "==", sub.customer)
            .limit(1)
            .get()
        ).docs[0]?.id
      : undefined);

  if (!uid) return;

  await db.collection("members").doc(uid).set(
    {
      stripeCustomerId:
        typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
    },
    { merge: true },
  );
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET missing" },
      { status: 503 },
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertMemberFromSubscription(
        event.data.object as Stripe.Subscription,
      );
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.firebaseUid;
      if (uid && session.subscription && getAdminDb()) {
        const stripeClient = getStripe();
        const sub = await stripeClient.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        if (!sub.metadata.firebaseUid) {
          await stripeClient.subscriptions.update(sub.id, {
            metadata: { firebaseUid: uid },
          });
        }
        await upsertMemberFromSubscription(sub);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
