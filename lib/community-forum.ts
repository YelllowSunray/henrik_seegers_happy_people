export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
  commentCount: number;
};

export type CommunityComment = {
  id: string;
  body: string;
  authorUid: string;
  authorName: string;
  createdAt: string;
};

export const COMMUNITY_POSTS_COLLECTION = "communityPosts";

export function displayNameFromUser(input: {
  displayName?: string | null;
  email?: string | null;
}): string {
  const name = input.displayName?.trim();
  if (name) return name;
  const email = input.email?.trim();
  if (email) return email.split("@")[0] || "Happy People";
  return "Happy People";
}

export function formatForumTime(iso: string, locale = "nl"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
