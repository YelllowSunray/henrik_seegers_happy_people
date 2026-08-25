import ar from "@/data/seminars/ar.json";
import de from "@/data/seminars/de.json";
import en from "@/data/seminars/en.json";
import es from "@/data/seminars/es.json";
import fr from "@/data/seminars/fr.json";
import it from "@/data/seminars/it.json";
import ko from "@/data/seminars/ko.json";
import nl from "@/data/seminars/nl.json";
import ru from "@/data/seminars/ru.json";
import zh from "@/data/seminars/zh.json";
import type { Locale } from "@/lib/types";

export type SeminarStoryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export type SeminarPageContent = {
  subtitle: string;
  ticketSalesOpen: boolean;
  storyBlocks: SeminarStoryBlock[];
  eventBlocks: SeminarStoryBlock[];
};

const byLocale: Record<Locale, SeminarPageContent> = {
  nl: nl as SeminarPageContent,
  en: en as SeminarPageContent,
  de: de as SeminarPageContent,
  es: es as SeminarPageContent,
  it: it as SeminarPageContent,
  fr: fr as SeminarPageContent,
  ko: ko as SeminarPageContent,
  ru: ru as SeminarPageContent,
  zh: zh as SeminarPageContent,
  ar: ar as SeminarPageContent,
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
  const content = byLocale[locale] ?? en;
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
