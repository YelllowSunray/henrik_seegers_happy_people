import en from "@/data/seminars/en.json";
import nl from "@/data/seminars/nl.json";
import type { Locale } from "@/lib/types";

export type SeminarStoryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export type SeminarPageContent = {
  subtitle: string;
  storyBlocks: SeminarStoryBlock[];
  eventBlocks: SeminarStoryBlock[];
};

const byLocale: Partial<Record<Locale, SeminarPageContent>> = {
  nl: nl as SeminarPageContent,
  en: en as SeminarPageContent,
};

/** Keep the first ~ratio of content sections (split at headings). */
function condenseBySections(
  blocks: SeminarStoryBlock[],
  ratio: number,
): SeminarStoryBlock[] {
  const sections: SeminarStoryBlock[][] = [];
  let current: SeminarStoryBlock[] = [];

  for (const block of blocks) {
    if (block.type === "heading" && current.length > 0) {
      sections.push(current);
      current = [block];
    } else {
      current.push(block);
    }
  }
  if (current.length > 0) sections.push(current);

  const keep = Math.max(1, Math.round(sections.length * ratio));
  return sections.slice(0, keep).flat();
}

export function getSeminarContent(
  locale: Locale,
  variant: "full" | "home" = "full",
): SeminarPageContent {
  const content = (byLocale[locale] ?? en) as SeminarPageContent;
  if (variant === "full") return content;
  return {
    ...content,
    storyBlocks: condenseBySections(content.storyBlocks, 0.5),
    eventBlocks: condenseBySections(content.eventBlocks, 0.45),
  };
}

export function formatEventDate(isoDate: string, locale: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
