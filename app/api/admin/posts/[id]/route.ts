import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  ADMIN_PASSWORD_HEADER,
  isValidAdminPassword,
} from "@/lib/admin-gate";
import { getAdminDb } from "@/lib/firebase/admin";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function requireAdmin(req: Request) {
  return isValidAdminPassword(req.headers.get(ADMIN_PASSWORD_HEADER));
}

type PatchBody = {
  title?: string;
  excerpt?: string;
  body?: string;
  publishedAt?: string;
  slug?: string;
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdmin(req)) return unauthorized();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (typeof body.title === "string") patch.title = { nl: body.title };
  if (typeof body.excerpt === "string") patch.excerpt = { nl: body.excerpt };
  if (typeof body.body === "string") patch.body = { nl: body.body };
  if (typeof body.publishedAt === "string") {
    patch.publishedAt = body.publishedAt;
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = body.slug.trim();
  }

  try {
    await db.collection("posts").doc(id).set(patch, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/posts] update failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireAdmin(_req)) return unauthorized();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  try {
    await db.collection("posts").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/posts] delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
