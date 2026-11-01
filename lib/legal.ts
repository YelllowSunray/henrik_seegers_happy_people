import { readFileSync } from "fs";
import { join } from "path";

export const LEGAL_SLUGS = [
  "disclaimer",
  "algemene-voorwaarden",
  "privacy",
  "cookies",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function readLegalMarkdown(slug: LegalSlug): string {
  return readFileSync(join(process.cwd(), "data/legal", `${slug}.md`), "utf8");
}

export function legalHref(href: string): string {
  if (href === "./cookiebeleid" || href.endsWith("cookiebeleid")) return "/cookies";
  if (href === "./privacyverklaring" || href.endsWith("privacyverklaring")) {
    return "/privacy";
  }
  return href;
}
