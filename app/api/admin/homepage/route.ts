import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  ADMIN_PASSWORD_HEADER,
  isValidAdminPassword,
} from "@/lib/admin-gate";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  getDefaultHomepageContent,
  HOMEPAGE_DOC_PATH,
  parseHomepageContent,
} from "@/lib/homepage-content";
import {
  fetchHomepageContent,
} from "@/lib/homepage-content.server";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function requireAdmin(req: Request) {
  return isValidAdminPassword(req.headers.get(ADMIN_PASSWORD_HEADER));
}

export async function GET(req: Request) {
  if (!requireAdmin(req)) return unauthorized();
  const content = await fetchHomepageContent();
  return NextResponse.json(content);
}

export async function PUT(req: Request) {
  if (!requireAdmin(req)) return unauthorized();

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = parseHomepageContent(body);
  try {
    await db
      .collection(HOMEPAGE_DOC_PATH.collection)
      .doc(HOMEPAGE_DOC_PATH.id)
      .set(
        {
          ...content,
          locale: "nl",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    console.error("[api/admin/homepage] save failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}

/** Seed defaults if missing — same auth as PUT. */
export async function POST(req: Request) {
  if (!requireAdmin(req)) return unauthorized();
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }
  const ref = db
    .collection(HOMEPAGE_DOC_PATH.collection)
    .doc(HOMEPAGE_DOC_PATH.id);
  const snap = await ref.get();
  if (snap.exists) {
    return NextResponse.json({
      ok: true,
      content: parseHomepageContent(snap.data() as Record<string, unknown>),
      seeded: false,
    });
  }
  const content = getDefaultHomepageContent();
  await ref.set({
    ...content,
    locale: "nl",
    updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true, content, seeded: true });
}
