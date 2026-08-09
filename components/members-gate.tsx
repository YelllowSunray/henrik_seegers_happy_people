"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";
import { MembershipPlans } from "@/components/membership-plans";

export function MembersGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isMember } = useAuth();
  const t = useTranslations("members");
  const tMem = useTranslations("membership");
  const tNav = useTranslations("nav");

  if (loading) {
    return <p className="py-20 text-center text-ink-soft">…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-display text-3xl text-ink">{tMem("title")}</p>
        <p className="mt-4 text-lg text-ink-soft">{t("locked")}</p>
        <Link
          href="/auth?next=/members"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          {tNav("signIn")}
        </Link>
      </div>
    );
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
        <MembershipPlans className="mt-10" />
      </div>
    );
  }

  return <>{children}</>;
}
