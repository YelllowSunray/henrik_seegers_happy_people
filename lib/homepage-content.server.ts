import "server-only";

import { cache } from "react";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  getDefaultHomepageContent,
  HOMEPAGE_DOC_PATH,
  parseHomepageContent,
  type HomepageContent,
} from "@/lib/homepage-content";

/**
 * Server-side fetch of homepage CMS doc. Falls back to Dutch message defaults
 * when Firebase admin is unavailable or the document is missing.
 */
export const fetchHomepageContent = cache(async (): Promise<HomepageContent> => {
  const db = getAdminDb();
  if (!db) return getDefaultHomepageContent();
  try {
    const snap = await db
      .collection(HOMEPAGE_DOC_PATH.collection)
      .doc(HOMEPAGE_DOC_PATH.id)
      .get();
    if (!snap.exists) return getDefaultHomepageContent();
    return parseHomepageContent(snap.data() as Record<string, unknown>);
  } catch (err) {
    console.error("[homepage-content] fetch failed:", err);
    return getDefaultHomepageContent();
  }
});

/**
 * Dutch site uses Firebase CMS. Other locales keep message-file copy until
 * translated in a later pass.
 */
export async function fetchHomepageCmsForLocale(
  locale: string,
): Promise<HomepageContent | null> {
  if (locale !== "nl") return null;
  return fetchHomepageContent();
}
