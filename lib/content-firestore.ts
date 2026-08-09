import { getAdminDb } from "@/lib/firebase/admin";
import {
  events as seedEvents,
  getMemberPosts as seedMemberPosts,
  getPostBySlug as seedGetPostBySlug,
  getPublicPosts as seedPublicPosts,
  getVideosByKind as seedVideosByKind,
  posts as seedPosts,
  quotes as seedQuotes,
  samplePersonalMessages,
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
import { BILLING_LIMIT_EUR, DEFAULT_BILLING_STATE } from "@/lib/billing";

function asLocalized(value: unknown, fallback = ""): LocalizedString {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    const nl = String(o.nl ?? fallback);
    return {
      nl,
      ...(typeof o.en === "string" ? { en: o.en } : {}),
      ...(typeof o.de === "string" ? { de: o.de } : {}),
    };
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
    location: String(data.location ?? "Almere"),
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
  return {
    id,
    toUserId: String(data.toUserId ?? ""),
    toEmail: typeof data.toEmail === "string" ? data.toEmail : undefined,
    subject: asLocalized(data.subject),
    body: asLocalized(data.body),
    createdAt: String(data.createdAt ?? ""),
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
    if (snap.empty) return [];
    return snap.docs.map((doc) => map(doc.id, doc.data() as Record<string, unknown>));
  } catch {
    return null;
  }
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const rows = await loadCollection("posts", mapPost);
  if (rows === null || rows.length === 0) return seedPosts;
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchPublicPosts(): Promise<BlogPost[]> {
  const all = await fetchPosts();
  const publicOnes = all.filter((p) => !p.membersOnly);
  if (publicOnes.length === 0 && all === seedPosts) return seedPublicPosts();
  if (publicOnes.length === 0) return seedPublicPosts();
  return publicOnes;
}

export async function fetchMemberPosts(): Promise<BlogPost[]> {
  const all = await fetchPosts();
  const members = all.filter((p) => p.membersOnly);
  if (members.length === 0) return seedMemberPosts();
  return members;
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const all = await fetchPosts();
  return all.find((p) => p.slug === slug) ?? seedGetPostBySlug(slug);
}

export async function fetchEvents(): Promise<SeminarEvent[]> {
  const rows = await loadCollection("events", mapEvent);
  if (rows === null || rows.length === 0) return seedEvents;
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchVideos(): Promise<VideoItem[]> {
  const rows = await loadCollection("videos", mapVideo);
  if (rows === null || rows.length === 0) return seedVideos;
  return rows.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function fetchVideosByKind(kind: VideoKind): Promise<VideoItem[]> {
  const all = await fetchVideos();
  const filtered = all.filter((v) => v.kind === kind);
  if (filtered.length === 0 && all === seedVideos) return seedVideosByKind(kind);
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
  if (rows === null || rows.length === 0) {
    return samplePersonalMessages.map((m) => ({
      ...m,
      toEmail: forEmail,
      read: m.read,
    }));
  }
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
    const data = snap.data() as Record<string, unknown>;
    return {
      overBudget: Boolean(data.overBudget),
      limitEur:
        typeof data.limitEur === "number" ? data.limitEur : BILLING_LIMIT_EUR,
      updatedAt:
        typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    };
  } catch {
    return DEFAULT_BILLING_STATE;
  }
}
