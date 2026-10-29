import nl from "@/messages/nl.json";
import seminarNl from "@/data/seminars/nl.json";

function blocksToParagraphs(
  blocks: { type?: string; text?: string; items?: string[] }[],
): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    if (block.type === "heading" && block.text) out.push(block.text);
    else if (block.type === "paragraph" && block.text) out.push(block.text);
    else if (block.type === "list" && block.items?.length) {
      out.push(block.items.map((item) => `• ${item}`).join("\n"));
    }
  }
  return out;
}

/** Firestore doc for Dutch site copy (other locales stay in message files for now). */
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
  site: {
    banner: string;
  };
  nav: {
    about: string;
    meeting: string;
    seminars: string;
    blog: string;
    membership: string;
  };
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
    eyebrow: string;
    title: string;
    teaser: string;
    imageCaption: string;
    subtitle: string;
    storyParagraphs: string[];
    eventParagraphs: string[];
    next: string;
    missed: string;
    membersOnly: string;
    allSeminars: string;
  };
  membership: {
    eyebrow: string;
    title: string;
    subtitle: string;
    introParagraphs: string[];
    bridgeParagraphs: string[];
    pitch: string;
    belongingTitle: string;
    communityParagraphs: string[];
    monthlyPlanTitle: string;
    monthlyBenefits: string[];
    yearlyPlanTitle: string;
    yearlyIntro: string;
    yearlyBenefits: string[];
    /** Short price line, e.g. €20 / maand */
    price: string;
    priceMonthly: string;
    priceYearly: string;
    monthlyDetail: string;
    yearlyDetail: string;
    monthlyLabel: string;
    yearlyLabel: string;
    yearlySave: string;
    noObligation: string;
    cta: string;
    ctaMonthly: string;
    ctaYearly: string;
    paradisePrompt: string;
    paradiseNote: string;
  };
  blog: {
    eyebrow: string;
    title: string;
    cta: string;
    read: string;
    empty: string;
    facebook: string;
  };
  donate: {
    eyebrow: string;
    title: string;
    lead: string;
    body: string;
    asideQuote: string;
    asideCredit: string;
  };
  footer: {
    tagline: string;
    facebook: string;
  };
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => String(item ?? ""));
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
    site: {
      banner: nl.site.underConstruction,
    },
    nav: {
      about: nl.nav.about,
      meeting: nl.nav.meeting,
      seminars: nl.nav.seminars,
      blog: nl.nav.blog,
      membership: nl.nav.membership,
    },
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
      eyebrow: nl.seminars.eyebrow,
      title: nl.seminars.title,
      teaser: nl.seminars.teaser,
      imageCaption: nl.seminars.imageCaption,
      subtitle: String(seminarNl.subtitle ?? nl.seminars.teaser),
      storyParagraphs: blocksToParagraphs(
        (seminarNl.storyBlocks ?? []) as {
          type?: string;
          text?: string;
          items?: string[];
        }[],
      ),
      eventParagraphs: blocksToParagraphs(
        (seminarNl.eventBlocks ?? []) as {
          type?: string;
          text?: string;
          items?: string[];
        }[],
      ),
      next: nl.seminars.next,
      missed: nl.seminars.missed,
      membersOnly: nl.seminars.membersOnly,
      allSeminars: nl.seminars.allSeminars,
    },
    membership: {
      eyebrow: nl.membership.eyebrow,
      title: nl.membership.title,
      subtitle: nl.membership.subtitle,
      introParagraphs: [...nl.membership.introParagraphs],
      bridgeParagraphs: [...nl.membership.bridgeParagraphs],
      pitch: nl.membership.pitch,
      belongingTitle: nl.membership.belongingTitle,
      communityParagraphs: [...nl.membership.communityParagraphs],
      monthlyPlanTitle: nl.membership.monthlyPlanTitle,
      monthlyBenefits: [...nl.membership.monthlyBenefits],
      yearlyPlanTitle: nl.membership.yearlyPlanTitle,
      yearlyIntro: nl.membership.yearlyIntro,
      yearlyBenefits: [...nl.membership.yearlyBenefits],
      price: nl.membership.price,
      priceMonthly: nl.membership.priceMonthly,
      priceYearly: nl.membership.priceYearly,
      monthlyDetail: nl.membership.monthlyDetail,
      yearlyDetail: nl.membership.yearlyDetail,
      monthlyLabel: nl.membership.monthlyLabel,
      yearlyLabel: nl.membership.yearlyLabel,
      yearlySave: nl.membership.yearlySave,
      noObligation: nl.membership.noObligation,
      cta: nl.membership.cta,
      ctaMonthly: nl.membership.ctaMonthly,
      ctaYearly: nl.membership.ctaYearly,
      paradisePrompt: nl.membership.paradisePrompt,
      paradiseNote: nl.membership.paradiseNote,
    },
    blog: {
      eyebrow: nl.blog.eyebrow,
      title: nl.blog.title,
      cta: nl.blog.cta,
      read: nl.blog.read,
      empty: nl.blog.empty,
      facebook: nl.blog.facebook,
    },
    donate: {
      eyebrow: nl.donate.eyebrow,
      title: nl.donate.title,
      lead: nl.donate.lead,
      body: nl.donate.body,
      asideQuote: nl.donate.asideQuote,
      asideCredit: nl.donate.asideCredit,
    },
    footer: {
      tagline: nl.footer.tagline,
      facebook: "Facebook — Hendrik Seegers",
    },
  };
}

export function parseHomepageContent(
  data: Record<string, unknown> | null | undefined,
): HomepageContent {
  const defaults = getDefaultHomepageContent();
  if (!data) return defaults;

  const site = (data.site ?? {}) as Record<string, unknown>;
  const nav = (data.nav ?? {}) as Record<string, unknown>;
  const hero = (data.hero ?? {}) as Record<string, unknown>;
  const message = (data.message ?? {}) as Record<string, unknown>;
  const about = (data.about ?? {}) as Record<string, unknown>;
  const meeting = (data.meeting ?? {}) as Record<string, unknown>;
  const seminars = (data.seminars ?? {}) as Record<string, unknown>;
  const membership = (data.membership ?? {}) as Record<string, unknown>;
  const blog = (data.blog ?? {}) as Record<string, unknown>;
  const donate = (data.donate ?? {}) as Record<string, unknown>;
  const footer = (data.footer ?? {}) as Record<string, unknown>;

  return {
    site: {
      banner: asString(site.banner, defaults.site.banner),
    },
    nav: {
      about: asString(nav.about, defaults.nav.about),
      meeting: asString(nav.meeting, defaults.nav.meeting),
      seminars: asString(nav.seminars, defaults.nav.seminars),
      blog: asString(nav.blog, defaults.nav.blog),
      membership: asString(nav.membership, defaults.nav.membership),
    },
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
      eyebrow: asString(seminars.eyebrow, defaults.seminars.eyebrow),
      title: asString(seminars.title, defaults.seminars.title),
      teaser: asString(seminars.teaser, defaults.seminars.teaser),
      imageCaption: asString(
        seminars.imageCaption,
        defaults.seminars.imageCaption,
      ),
      subtitle: asString(seminars.subtitle, defaults.seminars.subtitle),
      storyParagraphs: asStringArray(
        seminars.storyParagraphs,
        defaults.seminars.storyParagraphs,
      ),
      eventParagraphs: asStringArray(
        seminars.eventParagraphs,
        defaults.seminars.eventParagraphs,
      ),
      next: asString(seminars.next, defaults.seminars.next),
      missed: asString(seminars.missed, defaults.seminars.missed),
      membersOnly: asString(seminars.membersOnly, defaults.seminars.membersOnly),
      allSeminars: asString(
        seminars.allSeminars,
        defaults.seminars.allSeminars,
      ),
    },
    membership: {
      eyebrow: asString(membership.eyebrow, defaults.membership.eyebrow),
      title: asString(membership.title, defaults.membership.title),
      subtitle: asString(membership.subtitle, defaults.membership.subtitle),
      introParagraphs: asStringArray(
        membership.introParagraphs,
        defaults.membership.introParagraphs,
      ),
      bridgeParagraphs: asStringArray(
        membership.bridgeParagraphs,
        defaults.membership.bridgeParagraphs,
      ),
      pitch: asString(membership.pitch, defaults.membership.pitch),
      belongingTitle: asString(
        membership.belongingTitle,
        defaults.membership.belongingTitle,
      ),
      communityParagraphs: asStringArray(
        membership.communityParagraphs,
        defaults.membership.communityParagraphs,
      ),
      monthlyPlanTitle: asString(
        membership.monthlyPlanTitle,
        defaults.membership.monthlyPlanTitle,
      ),
      monthlyBenefits: asStringArray(
        membership.monthlyBenefits,
        defaults.membership.monthlyBenefits,
      ),
      yearlyPlanTitle: asString(
        membership.yearlyPlanTitle,
        defaults.membership.yearlyPlanTitle,
      ),
      yearlyIntro: asString(
        membership.yearlyIntro,
        defaults.membership.yearlyIntro,
      ),
      yearlyBenefits: asStringArray(
        membership.yearlyBenefits,
        defaults.membership.yearlyBenefits,
      ),
      price: asString(membership.price, defaults.membership.price),
      priceMonthly: asString(
        membership.priceMonthly,
        defaults.membership.priceMonthly,
      ),
      priceYearly: asString(
        membership.priceYearly,
        defaults.membership.priceYearly,
      ),
      monthlyDetail: asString(
        membership.monthlyDetail,
        defaults.membership.monthlyDetail,
      ),
      yearlyDetail: asString(
        membership.yearlyDetail,
        defaults.membership.yearlyDetail,
      ),
      monthlyLabel: asString(
        membership.monthlyLabel,
        defaults.membership.monthlyLabel,
      ),
      yearlyLabel: asString(
        membership.yearlyLabel,
        defaults.membership.yearlyLabel,
      ),
      yearlySave: asString(
        membership.yearlySave,
        defaults.membership.yearlySave,
      ),
      noObligation: asString(
        membership.noObligation,
        defaults.membership.noObligation,
      ),
      cta: asString(membership.cta, defaults.membership.cta),
      ctaMonthly: asString(
        membership.ctaMonthly,
        defaults.membership.ctaMonthly,
      ),
      ctaYearly: asString(membership.ctaYearly, defaults.membership.ctaYearly),
      paradisePrompt: asString(
        membership.paradisePrompt,
        defaults.membership.paradisePrompt,
      ),
      paradiseNote: asString(
        membership.paradiseNote,
        defaults.membership.paradiseNote,
      ),
    },
    blog: {
      eyebrow: asString(blog.eyebrow, defaults.blog.eyebrow),
      title: asString(blog.title, defaults.blog.title),
      cta: asString(blog.cta, defaults.blog.cta),
      read: asString(blog.read, defaults.blog.read),
      empty: asString(blog.empty, defaults.blog.empty),
      facebook: asString(blog.facebook, defaults.blog.facebook),
    },
    donate: {
      eyebrow: asString(donate.eyebrow, defaults.donate.eyebrow),
      title: asString(donate.title, defaults.donate.title),
      lead: asString(donate.lead, defaults.donate.lead),
      body: asString(donate.body, defaults.donate.body),
      asideQuote: asString(donate.asideQuote, defaults.donate.asideQuote),
      asideCredit: asString(donate.asideCredit, defaults.donate.asideCredit),
    },
    footer: {
      tagline: asString(footer.tagline, defaults.footer.tagline),
      facebook: asString(footer.facebook, defaults.footer.facebook),
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
  if (!override || override.length === 0) return fallback;
  const cleaned = override.map((p) => p.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function paragraphsToTextarea(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function textareaToParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
