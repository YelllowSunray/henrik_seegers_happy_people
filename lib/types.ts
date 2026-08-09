import type { Locale } from "@/i18n/locales";

export type { Locale };

export type LocalizedString = Partial<Record<Locale, string>> & { nl: string };

export type VideoKind = "seminar" | "vlog" | "sample";

export type BlogPost = {
  id: string;
  slug: string;
  title: LocalizedString;
  excerpt: LocalizedString;
  body: LocalizedString;
  publishedAt: string;
  membersOnly: boolean;
  coverImage?: string;
};

export type SeminarEvent = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  date: string;
  time: string;
  location: string;
  priceLabel?: string;
};

export type VideoItem = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  kind: VideoKind;
  /** External URL (YouTube/Vimeo/Storage) or empty for placeholder */
  videoUrl?: string;
  thumbnail?: string;
  publishedAt: string;
  durationLabel?: string;
};

export type QuoteItem = {
  id: string;
  text: LocalizedString;
  publishedAt: string;
};

export type PersonalMessage = {
  id: string;
  toUserId: string;
  toEmail?: string;
  subject: LocalizedString;
  body: LocalizedString;
  createdAt: string;
  read: boolean;
};

export type MemberProfile = {
  uid: string;
  email: string;
  displayName?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "none" | "trialing" | "active" | "past_due" | "canceled";
  isAdmin?: boolean;
};
