import { asDateString, yearFromDate } from "@/lib/dates";
import type { BlogPost, VideoItem } from "@/lib/types";

export const BLOG_CATEGORY_IDS = [
  "inzichten",
  "verhalen",
  "praktijk",
  "happy-people",
] as const;

export type BlogCategoryId = (typeof BLOG_CATEGORY_IDS)[number];

export const BLOG_CATEGORY_KEYS = {
  inzichten: "catInzichten",
  verhalen: "catVerhalen",
  praktijk: "catPraktijk",
  "happy-people": "catHappyPeople",
} as const;

export function isBlogCategoryId(value: string | undefined): value is BlogCategoryId {
  return Boolean(value && (BLOG_CATEGORY_IDS as readonly string[]).includes(value));
}

export function postYear(item: { publishedAt: string }): string | undefined {
  return yearFromDate(item.publishedAt);
}

export function vlogKindFilter(item: VideoItem): "video" | "audio" {
  return item.mediaType === "audio" || Boolean(item.audioUrl?.trim())
    ? "audio"
    : "video";
}

export function filterBlogPosts(
  posts: BlogPost[],
  categorie: string | undefined,
): BlogPost[] {
  if (!categorie || categorie === "alles") return posts;
  if (categorie === "nieuwste") return posts.slice(0, 5);
  if (/^\d{4}$/.test(categorie)) {
    return posts.filter((post) => postYear(post) === categorie);
  }
  return posts.filter((post) => post.category === categorie);
}

export function filterVlogs(
  items: VideoItem[],
  categorie: string | undefined,
): VideoItem[] {
  if (!categorie || categorie === "alles") return items;
  if (categorie === "nieuwste") return items.slice(0, 5);
  if (categorie === "video" || categorie === "audio") {
    return items.filter((item) => vlogKindFilter(item) === categorie);
  }
  if (/^\d{4}$/.test(categorie)) {
    return items.filter((item) => postYear(item) === categorie);
  }
  return items.filter((item) => item.category === categorie);
}

export function neighbors<T extends { id: string }>(
  items: T[],
  id: string,
): { prev?: T; next?: T } {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return {};
  return {
    next: items[index + 1],
    prev: items[index - 1],
  };
}

export function blogYears(posts: BlogPost[]): string[] {
  return uniqueYears(posts.map(postYear));
}

export function vlogYears(items: VideoItem[]): string[] {
  return uniqueYears(items.map(postYear));
}

function uniqueYears(years: Array<string | undefined>): string[] {
  return [...new Set(years.filter((year): year is string => Boolean(year)))].sort(
    (a, b) => b.localeCompare(a),
  );
}

export function usedBlogCategories(posts: BlogPost[]): BlogCategoryId[] {
  const used = new Set(
    posts
      .map((post) => post.category)
      .filter(isBlogCategoryId),
  );
  return BLOG_CATEGORY_IDS.filter((id) => used.has(id));
}

export function publishedDateLabel(publishedAt: string): string {
  return asDateString(publishedAt) || publishedAt;
}
