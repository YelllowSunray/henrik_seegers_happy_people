import { NextResponse } from "next/server";
import { verifyBearerUser } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase/admin";
import { SEMINAR_TICKET_CENTS } from "@/lib/stripe-constants";
import {
  donationPaymentMethodsForLocale,
  getStripe,
  isStripeDonateConfigured,
  stripeCheckoutLocale,
} from "@/lib/stripe";

export const runtime = "nodejs";

function localeFromReferer(req: Request) {
  const referer = req.headers.get("referer") || "";
  const match = referer.match(/\/(nl|en|de|es|it|fr|ko)(\/|$)/);
  return match?.[1] ?? "nl";
}

/** One-time seminar ticket Checkout (€1500). */
export async function POST(req: Request) {
  if (!isStripeDonateConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  try {
    let localeCode = localeFromReferer(req);
    let returnPath = "/seminars";
    let eventId = "";
    let eventTitle = "Happy People seminar";

    try {
      const body = (await req.json()) as {
        locale?: string;
        returnPath?: string;
        eventId?: string;
        eventTitle?: string;
      };
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
      if (typeof body.eventId === "string") eventId = body.eventId.slice(0, 80);
      if (typeof body.eventTitle === "string" && body.eventTitle.trim()) {
        eventTitle = body.eventTitle.trim().slice(0, 120);
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
        console.error("[stripe/seminar-ticket] customer attach failed", err);
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
            unit_amount: SEMINAR_TICKET_CENTS,
            product_data: {
              name: eventTitle,
              description: "Live seminar ticket — Happy People / Henrik Seegers",
            },
          },
        },
      ],
      locale: stripeCheckoutLocale(localeCode),
      payment_method_types: donationPaymentMethodsForLocale(localeCode),
      success_url: `${base}${sep}ticket=success`,
      cancel_url: `${base}${sep}ticket=cancel`,
      metadata: {
        kind: "seminar_ticket",
        amountCents: String(SEMINAR_TICKET_CENTS),
        ...(eventId ? { eventId } : {}),
        ...(caller ? { firebaseUid: caller.uid } : {}),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/seminar-ticket]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ticket purchase failed" },
      { status: 500 },
    );
  }
}
