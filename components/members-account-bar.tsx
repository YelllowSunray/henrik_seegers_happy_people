"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link, usePathname } from "@/i18n/navigation";
import { useClubActivity } from "@/components/club-activity-provider";
import { profileDisplayName, profileShortLabel } from "@/lib/profile";

export function MembersAccountBar() {
  const t = useTranslations("members");
  const { profile, isMember } = useAuth();
  const { activity } = useClubActivity();
  const pathname = usePathname();
  const name = profileDisplayName(profile);
  const initial = profileShortLabel(profile).slice(0, 1).toUpperCase();

  const profileActive = pathname.startsWith("/members/profile");
  const subActive = pathname.startsWith("/members/subscription");

  return (
    <div className="relative overflow-hidden border border-line bg-gradient-to-r from-bg-deep via-bg to-accent/5 px-4 py-4 sm:px-5">
      <div
        className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-accent/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/members/profile"
          className={`flex min-w-0 items-center gap-3 transition ${
            profileActive ? "text-accent" : "text-ink hover:text-accent"
          }`}
        >
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-line bg-bg ring-2 ring-accent/20">
            {profile?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photoURL}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-ink-soft">
                {initial}
              </span>
            )}
            {isMember && activity.total > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg bg-accent" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg leading-tight">
              {name ?? t("profile")}
            </span>
            <span className="block text-xs text-ink-soft">
              {isMember && activity.total > 0
                ? t("updatesWaiting", { count: activity.total })
                : t("editProfile")}
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isMember ? (
            <Link
              href="/members/chat"
              className="relative rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-accent"
            >
              {t("chat")}
              {activity.chat > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold">
                  {activity.chat}
                </span>
              )}
            </Link>
          ) : null}
          <Link
            href="/members/profile"
            className={`rounded-full px-3.5 py-2 text-sm ${
              profileActive
                ? "bg-accent text-white"
                : "border border-line text-ink-soft hover:text-ink"
            }`}
          >
            {t("profile")}
          </Link>
          <Link
            href="/members/subscription"
            className={`rounded-full px-3.5 py-2 text-sm ${
              subActive
                ? "bg-accent text-white"
                : "border border-line text-ink-soft hover:text-ink"
            }`}
          >
            {t("subscription")}
          </Link>
        </div>
      </div>
    </div>
  );
}
