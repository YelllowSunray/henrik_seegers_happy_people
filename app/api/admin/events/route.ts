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

type Body = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  dateUncertain?: boolean;
};

/** Create or update the next seminar event (password CMS). */
export async function PUT(req: Request) {
  if (!requireAdmin(req)) return unauthorized();

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase admin is not configured." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titel is verplicht." }, { status: 400 });
  }

  const payload = {
    title: { nl: title },
    description: { nl: String(body.description ?? "").trim() },
    date: String(body.date ?? new Date().toISOString().slice(0, 10)),
    time: String(body.time ?? ""),
    location: String(body.location ?? ""),
    address: String(body.address ?? ""),
    dateUncertain: Boolean(body.dateUncertain),
    updatedAt: FieldValue.serverTimestamp(),
  };

  try {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (id) {
      await db.collection("events").doc(id).set(payload, { merge: true });
      return NextResponse.json({ ok: true, id });
    }
    const ref = await db.collection("events").add({
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("[api/admin/events] save failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 },
    );
  }
}
