import type {
  BlogPost,
  Locale,
  LocalizedString,
  QuoteItem,
  SeminarEvent,
  VideoItem,
} from "./types";
import postsData from "@/data/content/posts.json";
import eventsData from "@/data/content/events.json";
import videosData from "@/data/content/videos.json";
import quotesData from "@/data/content/quotes.json";

export function t(localized: LocalizedString, locale: Locale): string {
  return localized[locale] ?? localized.en ?? localized.nl;
}

/** Public copy last saved from Firebase. Used when the project has no Firebase access. */
export const posts = postsData as BlogPost[];
export const events = eventsData as SeminarEvent[];
export const videos = videosData as VideoItem[];
export const quotes = quotesData as QuoteItem[];

export const samplePersonalMessages = [
  {
    id: "pm1",
    toUserId: "demo",
    subject: {
      nl: "Voor jou, met een glimlach",
      en: "For you, with a smile",
      de: "Für dich, mit einem Lächeln",
    },
    body: {
      nl: "Hoi — dit is hoe een persoonlijk bericht van Henk eruitziet in de club. Geen AI: hij schrijft het zelf, voor jou.",
      en: "Hi — this is what a personal message from Henk looks like in the club. No AI: he writes it himself, for you.",
      de: "Hi — so sieht eine persönliche Nachricht von Henk im Club aus. Keine KI: er schreibt sie selbst, für dich.",
    },
    createdAt: "2026-08-08",
    read: false,
  },
];

export function getPublicPosts() {
  return posts.filter((p) => !p.membersOnly);
}

export function getMemberPosts() {
  return posts.filter((p) => p.membersOnly);
}

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}

export function getVideosByKind(kind: VideoItem["kind"]) {
  return videos.filter((v) => v.kind === kind);
}
