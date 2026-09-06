"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { MembershipPlans } from "@/components/membership-plans";
import { signInHref } from "@/lib/auth-href";
import { needsOnboarding } from "@/lib/profile";

/** Account pages reachable without an active paid subscription. */
const BILLING_PATHS = new Set([
  "/members/subscription",
  "/members/profile",
]);

export function MembersGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember, profile, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const t = useTranslations("members");
  const tMem = useTranslations("membership");
  const tSub = useTranslations("subscription");
  const tNav = useTranslations("nav");
  const [checkoutCancelled, setCheckoutCancelled] = useState(false);
  const onOnboarding = pathname === "/members/onboarding";
  const onBillingPath = BILLING_PATHS.has(pathname);

  useEffect(() => {
    if (search.get("checkout") !== "cancel") return;
    setCheckoutCancelled(true);
    router.replace(pathname, { scroll: false });
  }, [search, pathname, router]);

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

  if (onOnboarding) {
    return <>{children}</>;
  }

  if (needsOnboarding(profile) && !isAdmin) {
    return <p className="py-20 text-center text-ink-soft">…</p>;
  }

  if (!isMember && onBillingPath) {
    return <>{children}</>;
  }

  if (!isMember) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="text-center">
          <p className="font-display text-3xl text-ink sm:text-4xl">
            {tMem("title")}
          </p>
          <p className="mt-3 text-ink-soft">{t("locked")}</p>
        </div>
        {checkoutCancelled && (
          <p className="mt-6 border border-line bg-bg-deep/50 px-4 py-3 text-center text-sm text-ink-soft">
            {tSub("checkoutCancel")}
          </p>
        )}
        <MembershipPlans className="mt-10" cancelPath={pathname} />
      </div>
    );
  }

  return <>{children}</>;
}
