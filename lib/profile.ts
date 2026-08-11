import { isActiveSubscription } from "@/lib/membership";
import type { MemberProfile } from "@/lib/types";

/** Every non-admin finishes name/phone/photo once (before or after checkout). */
export function needsOnboarding(
  profile: MemberProfile | null | undefined,
): boolean {
  if (!profile || profile.isAdmin) return false;
  return !profile.onboardingCompleted;
}

/** Where to send someone right after they create an account. */
export function postSignUpPath(
  profile: MemberProfile | null | undefined,
  isAdmin: boolean,
): string {
  if (isAdmin) return "/admin";
  if (needsOnboarding(profile)) return "/members/onboarding";
  if (!isActiveSubscription(profile?.subscriptionStatus)) return "/members";
  return "/members";
}

export function profileDisplayName(
  profile: MemberProfile | null | undefined,
): string | null {
  if (!profile) return null;
  const name = profile.displayName?.trim();
  return name || null;
}

/** Fallback label for avatars / compact UI when no display name is set. */
export function profileShortLabel(
  profile: MemberProfile | null | undefined,
): string {
  return (
    profileDisplayName(profile) ||
    profile?.email?.split("@")[0] ||
    "?"
  );
}
