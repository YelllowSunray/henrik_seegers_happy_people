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
} from "@/components/youtube-embed";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

type PatchBody = {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  category?: string;
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
  if (typeof body.title === "string") patch.title = { nl: body.title.trim() };
  if (typeof body.description === "string") {
    patch.description = { nl: body.description.trim() };
  }
  if (typeof body.videoUrl === "string") {
    const videoUrl = toPlayableUrl(body.videoUrl);
    if (!videoUrl) {
      return NextResponse.json(
        { error: "Voeg een opname toe of plak een YouTube-link." },
        { status: 400 },
      );
    }
    patch.videoUrl = videoUrl;
    patch.mediaType = "video";
    const youtubeId = youtubeIdFromUrl(videoUrl);
    if (typeof body.thumbnail === "string") {
      patch.thumbnail = body.thumbnail.trim();
    } else if (youtubeId) {
      patch.thumbnail = youtubeThumbSrc(youtubeId);
    }
  } else if (typeof body.thumbnail === "string") {
    patch.thumbnail = body.thumbnail.trim();
  }
  if (typeof body.category === "string") {
    patch.category = body.category.trim();
  }

  try {
    await db.collection("videos").doc(id).set(patch, { merge: true });
    return NextResponse.json({
      ok: true,
      videoUrl: typeof patch.videoUrl === "string" ? patch.videoUrl : undefined,
    });
  } catch (err) {
    console.error("[api/admin/videos] update failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  try {
    await db.collection("videos").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/videos] delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
