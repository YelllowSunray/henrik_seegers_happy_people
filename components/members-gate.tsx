"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link, usePathname } from "@/i18n/navigation";
import { MembershipPlans } from "@/components/membership-plans";
import { signInHref } from "@/lib/auth-href";
import { isAppTrialExpired } from "@/lib/membership";
import { needsOnboarding } from "@/lib/profile";

/** Account pages that stay reachable after the free week ends. */
const BILLING_PATHS = new Set([
  "/members/subscription",
  "/members/profile",
]);

export function MembersGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember, profile, isAdmin } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("members");
  const tMem = useTranslations("membership");
  const tNav = useTranslations("nav");
  const onOnboarding = pathname === "/members/onboarding";
  const onBillingPath = BILLING_PATHS.has(pathname);
  const trialExpired = isAppTrialExpired(profile);

  if (loading) {
    return <p className="py-20 text-center text-ink-soft">…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-3xl text-ink">{tMem("title")}</p>
        <p className="mt-4 text-lg text-ink-soft">{t("locked")}</p>
        <Link
          href={signInHref(pathname || "/members")}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          {tNav("signIn")}
        </Link>
      </div>
    );
  }

  // Let onboarding render; shell also redirects here when profile is incomplete.
  if (onOnboarding) {
    return <>{children}</>;
  }

  if (needsOnboarding(profile) && !isAdmin) {
    return <p className="py-20 text-center text-ink-soft">…</p>;
  }

  // After the free week: subscription / profile stay open; club content stays locked.
  if (!isMember && onBillingPath) {
    return <>{children}</>;
  }

  if (!isMember) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="text-center">
          <p className="font-display text-3xl text-ink sm:text-4xl">
            {trialExpired ? t("lockedTrialTitle") : tMem("title")}
          </p>
          <p className="mt-3 text-ink-soft">
            {trialExpired ? t("lockedTrial") : t("locked")}
          </p>
        </div>
        <MembershipPlans className="mt-10" />
      </div>
    );
  }

  return <>{children}</>;
}
