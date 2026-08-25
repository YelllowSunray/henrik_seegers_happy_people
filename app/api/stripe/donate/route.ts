import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  donationPaymentMethodsForLocale,
  getStripe,
  isStripeDonateConfigured,
  parseDonationAmountCents,
  stripeCheckoutLocale,
} from "@/lib/stripe";

export const runtime = "nodejs";

function localeFromReferer(req: Request) {
  const referer = req.headers.get("referer") || "";
  const match = referer.match(/\/(nl|en|de|es|it|fr|ko|ru|zh|ar)(\/|$)/);
  return match?.[1] ?? "nl";
}

/**
 * One-time donation Checkout (payment mode). Auth optional —
 * signed-in members are attached to their Stripe customer when available.
 */
export async function POST(req: Request) {
  if (!isStripeDonateConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  try {
    let amountCents = parseDonationAmountCents(undefined);
    let localeCode = localeFromReferer(req);
    let returnPath = "/";
    try {
      const body = (await req.json()) as {
        amountCents?: number;
        locale?: string;
        returnPath?: string;
      };
      if (body.amountCents != null) {
        amountCents = parseDonationAmountCents(body.amountCents);
      }
      if (body.locale && /^[a-z]{2}$/.test(body.locale)) {
        localeCode = body.locale;
      }
      if (
        typeof body.returnPath === "string" &&
        body.returnPath.startsWith("/") &&
        !body.returnPath.startsWith("//")
      ) {
        returnPath = body.returnPath;
      }
    } catch {
      /* defaults */
    }

    const stripe = getStripe();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://henrik-seegers-happy-people.vercel.app";
    const caller = await verifyBearerUser(req.headers.get("authorization"));

    let customerId: string | undefined;
    if (caller) {
      try {
        const db = getAdminDb();
        if (db) {
          const snap = await db.collection("members").doc(caller.uid).get();
          customerId = snap.data()?.stripeCustomerId as string | undefined;
        }
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: caller.email || undefined,
            metadata: { firebaseUid: caller.uid },
          });
          customerId = customer.id;
          if (db) {
            await db.collection("members").doc(caller.uid).set(
              {
                uid: caller.uid,
                email: caller.email,
                stripeCustomerId: customerId,
              },
              { merge: true },
            );
          }
        }
      } catch (err) {
        console.error("[stripe/donate] customer attach failed", err);
      }
    }

    const path = returnPath === "/" ? "" : returnPath;
    const base = `${appUrl.replace(/\/$/, "")}/${localeCode}${path}`;
    const sep = base.includes("?") ? "&" : "?";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...(customerId
        ? { customer: customerId }
        : caller?.email
          ? { customer_email: caller.email }
          : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountCents,
            product_data: {
              name: "Donation — Happy People",
              description:
                "One-time gift to support Hendrik Seegers / Happy People",
            },
          },
        },
      ],
      locale: stripeCheckoutLocale(localeCode),
      payment_method_types: donationPaymentMethodsForLocale(localeCode),
      success_url: `${base}${sep}donate=success`,
      cancel_url: `${base}${sep}donate=cancel`,
      metadata: {
        kind: "donation",
        ...(caller ? { firebaseUid: caller.uid } : {}),
        amountCents: String(amountCents),
      },
      submit_type: "donate",
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/donate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Donation failed" },
      { status: 500 },
    );
  }
}
