"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";
import { JoinButton } from "@/components/join-button";

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
      <div className="py-16 text-center">
        <p className="text-lg text-ink-soft">{t("locked")}</p>
        <Link
          href="/auth?next=/members"
          className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
        >
          {tNav("signIn")}
        </Link>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-ink-soft">{t("locked")}</p>
        <div className="mt-6 flex justify-center">
          <JoinButton label={tMem("cta")} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
