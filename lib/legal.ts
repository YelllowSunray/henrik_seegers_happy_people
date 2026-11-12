import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const LEGAL_SLUGS = [
  "disclaimer",
  "algemene-voorwaarden",
  "privacy",
  "cookies",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function readLegalMarkdown(slug: LegalSlug, locale = "nl"): string {
  if (locale && locale !== "nl") {
    const localized = join(process.cwd(), "data/legal", locale, `${slug}.md`);
    if (existsSync(localized)) return readFileSync(localized, "utf8");
  }
  return readFileSync(join(process.cwd(), "data/legal", `${slug}.md`), "utf8");
}

export function legalHref(href: string): string {
  if (href === "./cookiebeleid" || href.endsWith("cookiebeleid")) return "/cookies";
  if (href === "./privacyverklaring" || href.endsWith("privacyverklaring")) {
    return "/privacy";
  }
  return href;
}
