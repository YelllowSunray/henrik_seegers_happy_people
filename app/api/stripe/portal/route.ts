import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

function localeFromReferer(req: Request) {
  const referer = req.headers.get("referer") || "";
  const match = referer.match(/\/(nl|en|de|es|it|fr|ko)(\/|$)/);
  return match?.[1] ?? "nl";
}

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

  const snap = await db.collection("members").doc(user.uid).get();
  const customerId = snap.data()?.stripeCustomerId as string | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing customer found." },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  let locale = localeFromReferer(req);
  try {
    const body = (await req.json()) as { locale?: string };
    if (body.locale && /^[a-z]{2}$/.test(body.locale)) locale = body.locale;
  } catch {
    /* no body */
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/${locale}/members/subscription`,
  });

  return NextResponse.json({ url: session.url });
}
