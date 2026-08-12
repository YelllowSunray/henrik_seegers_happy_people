import { NextResponse } from "next/server";

/** Presence-only probe (no secret values). */
export async function GET() {
  const flag = (key: string) => Boolean(process.env[key]?.trim());
  return NextResponse.json({
    ok: true,
    env: {
      firebaseAdmin: flag("FIREBASE_ADMIN_PRIVATE_KEY"),
      firebasePublic: flag("NEXT_PUBLIC_FIREBASE_API_KEY"),
      stripe: flag("STRIPE_SECRET_KEY"),
      appUrl: flag("NEXT_PUBLIC_APP_URL"),
    },
  });
}
