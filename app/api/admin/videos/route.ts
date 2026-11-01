import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  ADMIN_PASSWORD_HEADER,
  isValidAdminPassword,
} from "@/lib/admin-gate";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  youtubeIdFromUrl,
  youtubeThumbSrc,
  youtubeWatchUrl,
} from "@/lib/youtube";

function unauthorized() {
  return NextResponse.json(
    { error: "Niet gemachtigd. De vlog is niet opgeslagen." },
    { status: 401 },
  );
}

function requireAdmin(req: Request) {
  return isValidAdminPassword(req.headers.get(ADMIN_PASSWORD_HEADER));
}

function toPlayableUrl(raw: string) {
  const trimmed = raw.trim();
  const id = youtubeIdFromUrl(trimmed);
  if (id) return youtubeWatchUrl(id);
  return trimmed;
}

/** Create a public Dutch vlog (YouTube link + title). */
export async function POST(req: Request) {
  if (!requireAdmin(req)) return unauthorized();

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "De database is niet bereikbaar. De vlog is niet opgeslagen." },
      { status: 503 },
    );
  }

  let body: {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnail?: string;
    category?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige gegevens. De vlog is niet opgeslagen." },
      { status: 400 },
    );
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const videoUrl = toPlayableUrl(String(body.videoUrl ?? ""));
  const youtubeId = youtubeIdFromUrl(videoUrl);
  const thumbnail =
    String(body.thumbnail ?? "").trim() ||
    (youtubeId ? youtubeThumbSrc(youtubeId) : "");
  const category = String(body.category ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titel is verplicht." }, { status: 400 });
  }
  if (!videoUrl) {
    return NextResponse.json(
      { error: "Voeg een opname toe of plak een YouTube-link." },
      { status: 400 },
    );
  }

  const publishedAt = new Date().toISOString().slice(0, 10);

  try {
    const ref = await db.collection("videos").add({
      kind: "vlog",
      mediaType: "video",
      title: { nl: title },
      description: { nl: description },
      videoUrl,
      ...(thumbnail ? { thumbnail } : {}),
      publishedAt,
      ...(category ? { category } : {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({
      ok: true,
      video: {
        id: ref.id,
        kind: "vlog",
        mediaType: "video",
        title: { nl: title },
        description: { nl: description },
        videoUrl,
        ...(thumbnail ? { thumbnail } : {}),
        publishedAt,
        ...(category ? { category } : {}),
      },
    });
  } catch (err) {
    console.error("[api/admin/videos] create failed:", err);
    return NextResponse.json(
      { error: "Opslaan mislukt. De vlog is niet opgeslagen." },
      { status: 500 },
    );
  }
}
