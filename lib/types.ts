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
  /** Street address / venue details */
  address?: string;
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
  phone?: string;
  photoURL?: string;
  onboardingCompleted?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "none" | "trialing" | "active" | "past_due" | "canceled";
  /** ISO end of complimentary free week before paid plan is required */
  trialEndsAt?: string;
  membershipPlan?: "monthly" | "yearly";
  isAdmin?: boolean;
  /** ISO timestamps of last visit per club section */
  activitySeen?: {
    seminars?: string;
    vlogs?: string;
    quotes?: string;
    messages?: string;
    teachings?: string;
    chat?: string;
  };
};

export type ChatSenderRole = "member" | "admin";

export type ChatThread = {
  id: string;
  memberUid: string;
  memberEmail: string;
  memberName?: string;
  memberPhotoURL?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderRole?: ChatSenderRole;
  updatedAt?: string;
  memberLastReadAt?: string;
  adminLastReadAt?: string;
};

export type ClubSection =
  | "seminars"
  | "vlogs"
  | "quotes"
  | "messages"
  | "teachings"
  | "chat";

export type ClubActivity = {
  seminars: number;
  vlogs: number;
  quotes: number;
  messages: number;
  teachings: number;
  chat: number;
  total: number;
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderRole: ChatSenderRole;
  createdAt: string;
};
