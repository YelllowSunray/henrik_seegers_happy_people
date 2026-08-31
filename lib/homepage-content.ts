import { cache } from "react";
import nl from "@/messages/nl.json";
import { getAdminDb } from "@/lib/firebase/admin";

export const HOMEPAGE_DOC_PATH = {
  collection: "siteContent",
  id: "homepage",
} as const;

export type MeetingBlockContent = {
  song: string;
  youtube: string;
  text: string;
};

export type HomepageContent = {
  hero: {
    brand: string;
    headline: string;
    support: string;
    ctaJoin: string;
    ctaSeminar: string;
  };
  message: {
    eyebrow: string;
    title: string;
    short: string;
    paragraphs: string[];
  };
  about: {
    eyebrow: string;
    title: string;
    teaser: string;
    paragraphs: string[];
    readMore: string;
  };
  meeting: {
    eyebrow: string;
    title: string;
    bridge: string;
    blocks: MeetingBlockContent[];
  };
  seminars: {
    imageCaption: string;
  };
  membership: {
    paradisePrompt: string;
    paradiseNote: string;
  };
  donate: {
    eyebrow: string;
    title: string;
    lead: string;
    body: string;
  };
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item ?? "")).filter((s) => s.trim().length > 0);
}

function asMeetingBlocks(
  value: unknown,
  fallback: MeetingBlockContent[],
): MeetingBlockContent[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const fb = fallback[i] ?? { song: "", youtube: "", text: "" };
    return {
      song: asString(item.song, fb.song),
      youtube: asString(item.youtube, fb.youtube),
      text: asString(item.text, fb.text),
    };
  });
}

export function getDefaultHomepageContent(): HomepageContent {
  return {
    hero: {
      brand: nl.hero.brand,
      headline: nl.hero.headline,
      support: nl.hero.support,
      ctaJoin: nl.hero.ctaJoin,
      ctaSeminar: nl.hero.ctaSeminar,
    },
    message: {
      eyebrow: nl.message.eyebrow,
      title: nl.message.title,
      short: nl.message.short,
      paragraphs: [...nl.message.paragraphs],
    },
    about: {
      eyebrow: nl.about.eyebrow,
      title: nl.about.title,
      teaser: nl.about.teaser,
      paragraphs: [...nl.about.paragraphs],
      readMore: nl.about.readMore,
    },
    meeting: {
      eyebrow: nl.meeting.eyebrow,
      title: nl.meeting.title,
      bridge: nl.meeting.bridge,
      blocks: nl.meeting.blocks.map((b) => ({ ...b })),
    },
    seminars: {
      imageCaption: nl.seminars.imageCaption,
    },
    membership: {
      paradisePrompt: nl.membership.paradisePrompt,
      paradiseNote: nl.membership.paradiseNote,
    },
    donate: {
      eyebrow: nl.donate.eyebrow,
      title: nl.donate.title,
      lead: nl.donate.lead,
      body: nl.donate.body,
    },
  };
}

export function parseHomepageContent(
  data: Record<string, unknown> | null | undefined,
): HomepageContent {
  const defaults = getDefaultHomepageContent();
  if (!data) return defaults;

  const hero = (data.hero ?? {}) as Record<string, unknown>;
  const message = (data.message ?? {}) as Record<string, unknown>;
  const about = (data.about ?? {}) as Record<string, unknown>;
  const meeting = (data.meeting ?? {}) as Record<string, unknown>;
  const seminars = (data.seminars ?? {}) as Record<string, unknown>;
  const membership = (data.membership ?? {}) as Record<string, unknown>;
  const donate = (data.donate ?? {}) as Record<string, unknown>;

  return {
    hero: {
      brand: asString(hero.brand, defaults.hero.brand),
      headline: asString(hero.headline, defaults.hero.headline),
      support: asString(hero.support, defaults.hero.support),
      ctaJoin: asString(hero.ctaJoin, defaults.hero.ctaJoin),
      ctaSeminar: asString(hero.ctaSeminar, defaults.hero.ctaSeminar),
    },
    message: {
      eyebrow: asString(message.eyebrow, defaults.message.eyebrow),
      title: asString(message.title, defaults.message.title),
      short: asString(message.short, defaults.message.short),
      paragraphs: asStringArray(message.paragraphs, defaults.message.paragraphs),
    },
    about: {
      eyebrow: asString(about.eyebrow, defaults.about.eyebrow),
      title: asString(about.title, defaults.about.title),
      teaser: asString(about.teaser, defaults.about.teaser),
      paragraphs: asStringArray(about.paragraphs, defaults.about.paragraphs),
      readMore: asString(about.readMore, defaults.about.readMore),
    },
    meeting: {
      eyebrow: asString(meeting.eyebrow, defaults.meeting.eyebrow),
      title: asString(meeting.title, defaults.meeting.title),
      bridge: asString(meeting.bridge, defaults.meeting.bridge),
      blocks: asMeetingBlocks(meeting.blocks, defaults.meeting.blocks),
    },
    seminars: {
      imageCaption: asString(
        seminars.imageCaption,
        defaults.seminars.imageCaption,
      ),
    },
    membership: {
      paradisePrompt: asString(
        membership.paradisePrompt,
        defaults.membership.paradisePrompt,
      ),
      paradiseNote: asString(
        membership.paradiseNote,
        defaults.membership.paradiseNote,
      ),
    },
    donate: {
      eyebrow: asString(donate.eyebrow, defaults.donate.eyebrow),
      title: asString(donate.title, defaults.donate.title),
      lead: asString(donate.lead, defaults.donate.lead),
      body: asString(donate.body, defaults.donate.body),
    },
  };
}

/** Prefer CMS when non-empty; otherwise fall back (used for Dutch site). */
export function cmsText(override: string | undefined, fallback: string): string {
  const v = override?.trim();
  return v ? v : fallback;
}

export function cmsParagraphs(
  override: string[] | undefined,
  fallback: string[],
): string[] {
  if (override && override.length > 0) return override;
  return fallback;
}

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

export function paragraphsToTextarea(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function textareaToParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
