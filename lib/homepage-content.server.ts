import "server-only";

import { cache } from "react";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  getDefaultHomepageContent,
  HOMEPAGE_DOC_PATH,
  parseHomepageContent,
  type HomepageContent,
} from "@/lib/homepage-content";

type RestValue = {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  timestampValue?: string;
  arrayValue?: { values?: RestValue[] };
  mapValue?: { fields?: Record<string, RestValue> };
};

function fromRest(v: RestValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(fromRest);
  if (v.mapValue) {
    return Object.fromEntries(
      Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromRest(x)]),
    );
  }
  return null;
}

/** Public-read fallback (Firestore REST) when no service-account key is configured. */
async function fetchHomepageViaRest(): Promise<HomepageContent> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return getDefaultHomepageContent();
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/` +
    `${HOMEPAGE_DOC_PATH.collection}/${HOMEPAGE_DOC_PATH.id}?key=${apiKey}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return getDefaultHomepageContent();
    const json = (await res.json()) as { fields?: Record<string, RestValue> };
    const data = fromRest({ mapValue: { fields: json.fields ?? {} } });
    return parseHomepageContent(data as Record<string, unknown>);
  } catch (err) {
    console.error("[homepage-content] REST fetch failed:", err);
    return getDefaultHomepageContent();
  }
}

/**
 * Server-side fetch of homepage CMS doc. Falls back to Dutch message defaults
 * when Firestore is unreachable or the document is missing.
 */
export const fetchHomepageContent = cache(async (): Promise<HomepageContent> => {
  const db = getAdminDb();
  if (!db) return fetchHomepageViaRest();
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
