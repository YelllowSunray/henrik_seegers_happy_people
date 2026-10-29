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

function slugify(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `post-${Date.now()}`
  );
}

/** Create a public Dutch blog post. */
export async function POST(req: Request) {
  if (!requireAdmin(req)) return unauthorized();

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  let body: {
    title?: string;
    excerpt?: string;
    body?: string;
    publishedAt?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const excerpt = String(body.excerpt ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titel is verplicht." }, { status: 400 });
  }

  const slug = slugify(title);
  const publishedAt =
    String(body.publishedAt ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  try {
    const ref = await db.collection("posts").add({
      slug,
      title: { nl: title },
      excerpt: { nl: excerpt },
      body: { nl: text },
      membersOnly: false,
      publishedAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({
      ok: true,
      post: {
        id: ref.id,
        slug,
        title: { nl: title },
        excerpt: { nl: excerpt },
        body: { nl: text },
        publishedAt,
        membersOnly: false,
      },
    });
  } catch (err) {
    console.error("[api/admin/posts] create failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 },
    );
  }
}
