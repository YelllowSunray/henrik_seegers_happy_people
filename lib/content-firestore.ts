import { locales } from "@/i18n/locales";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  events as seedEvents,
  getMemberPosts as seedMemberPosts,
  getPostBySlug as seedGetPostBySlug,
  getPublicPosts as seedPublicPosts,
  getVideosByKind as seedVideosByKind,
  posts as seedPosts,
  quotes as seedQuotes,
  videos as seedVideos,
} from "@/lib/content";
import type {
  BlogPost,
  LocalizedString,
  PersonalMessage,
  QuoteItem,
  SeminarEvent,
  VideoItem,
  VideoKind,
} from "@/lib/types";
import type { BillingState } from "@/lib/billing";
import { DEFAULT_BILLING_STATE, parseBillingDoc } from "@/lib/billing";

function asLocalized(value: unknown, fallback = ""): LocalizedString {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const nl = String(o.nl ?? o.en ?? fallback);
    const out: LocalizedString = { nl };
    for (const loc of locales) {
      if (loc !== "nl" && typeof o[loc] === "string") {
        out[loc] = o[loc] as string;
      }
    }
    return out;
  }
  if (typeof value === "string") return { nl: value };
  return { nl: fallback };
}

function mapPost(id: string, data: Record<string, unknown>): BlogPost {
  return {
    id,
    slug: String(data.slug ?? id),
    title: asLocalized(data.title),
    excerpt: asLocalized(data.excerpt),
    body: asLocalized(data.body),
    publishedAt: String(data.publishedAt ?? ""),
    membersOnly: Boolean(data.membersOnly),
    coverImage:
      typeof data.coverImage === "string" ? data.coverImage : undefined,
  };
}

function mapEvent(id: string, data: Record<string, unknown>): SeminarEvent {
  return {
    id,
    title: asLocalized(data.title),
    description: asLocalized(data.description),
    date: String(data.date ?? ""),
    time: String(data.time ?? ""),
    location: String(data.location ?? "Van der Valk Hotel Amersfoort"),
    address:
      typeof data.address === "string" && data.address.trim()
        ? data.address.trim()
        : undefined,
    priceLabel:
      typeof data.priceLabel === "string" ? data.priceLabel : undefined,
  };
}

function mapVideo(id: string, data: Record<string, unknown>): VideoItem {
  const kind = String(data.kind ?? "seminar") as VideoKind;
  return {
    id,
    title: asLocalized(data.title),
    description: asLocalized(data.description),
    kind:
      kind === "vlog" || kind === "sample" || kind === "seminar"
        ? kind
        : "seminar",
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : undefined,
    thumbnail: typeof data.thumbnail === "string" ? data.thumbnail : undefined,
    publishedAt: String(data.publishedAt ?? ""),
    durationLabel:
      typeof data.durationLabel === "string" ? data.durationLabel : undefined,
  };
}

function mapQuote(id: string, data: Record<string, unknown>): QuoteItem {
  return {
    id,
    text: asLocalized(data.text),
    publishedAt: String(data.publishedAt ?? ""),
  };
}

function mapMessage(id: string, data: Record<string, unknown>): PersonalMessage {
  let createdAt = "";
  const raw = data.createdAt;
  if (raw && typeof raw === "object" && "toDate" in raw) {
    createdAt = (raw as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  } else {
    createdAt = String(raw ?? "");
  }
  return {
    id,
    toUserId: String(data.toUserId ?? ""),
    toEmail: typeof data.toEmail === "string" ? data.toEmail : undefined,
    subject: asLocalized(data.subject),
    body: asLocalized(data.body),
    createdAt,
    read: Boolean(data.read),
  };
}

async function loadCollection<T>(
  name: string,
  map: (id: string, data: Record<string, unknown>) => T,
): Promise<T[] | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection(name).get();
    return snap.docs.map((doc) =>
      map(doc.id, doc.data() as Record<string, unknown>),
    );
  } catch (err) {
    console.error(`[content-firestore] load ${name} failed:`, err);
    return null;
  }
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const rows = await loadCollection("posts", mapPost);
  if (rows === null) return seedPosts;
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchPublicPosts(): Promise<BlogPost[]> {
  const rows = await loadCollection("posts", mapPost);
  if (rows === null) return seedPublicPosts();
  return rows
    .filter((p) => !p.membersOnly)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchMemberPosts(): Promise<BlogPost[]> {
  const rows = await loadCollection("posts", mapPost);
  if (rows === null) return seedMemberPosts();
  return rows
    .filter((p) => p.membersOnly)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const rows = await loadCollection("posts", mapPost);
  if (rows === null) return seedGetPostBySlug(slug);
  return rows.find((p) => p.slug === slug);
}

export async function fetchEvents(): Promise<SeminarEvent[]> {
  const rows = await loadCollection("events", mapEvent);
  if (rows === null) return seedEvents;
  if (rows.length === 0) return seedEvents;
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchVideos(): Promise<VideoItem[]> {
  const rows = await loadCollection("videos", mapVideo);
  if (rows === null || rows.length === 0) return seedVideos;
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchVideosByKind(
  kind: VideoKind,
  options?: { firestoreOnly?: boolean },
): Promise<VideoItem[]> {
  const rows = await loadCollection("videos", mapVideo);

  if (options?.firestoreOnly) {
    if (!rows) return [];
    return rows
      .filter((v) => v.kind === kind)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  const all = rows === null || rows.length === 0 ? seedVideos : rows;
  const filtered = all.filter((v) => v.kind === kind);
  if (filtered.length === 0) return seedVideosByKind(kind);
  return filtered;
}

export async function fetchQuotes(): Promise<QuoteItem[]> {
  const rows = await loadCollection("quotes", mapQuote);
  if (rows === null || rows.length === 0) return seedQuotes;
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchPersonalMessages(forEmail?: string): Promise<PersonalMessage[]> {
  const rows = await loadCollection("personalMessages", mapMessage);
  if (rows === null) return [];
  if (rows.length === 0) return [];
  if (!forEmail) return rows;
  const email = forEmail.toLowerCase();
  return rows.filter(
    (m) => m.toEmail?.toLowerCase() === email || m.toUserId === "demo",
  );
}

export async function fetchBillingState(): Promise<BillingState> {
  const db = getAdminDb();
  if (!db) return DEFAULT_BILLING_STATE;
  try {
    const snap = await db.doc("system/billing").get();
    if (!snap.exists) return DEFAULT_BILLING_STATE;
    return parseBillingDoc(snap.data() as Record<string, unknown>);
  } catch {
    return DEFAULT_BILLING_STATE;
  }
}
