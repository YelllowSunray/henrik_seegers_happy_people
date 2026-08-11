"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProfileForm } from "@/components/profile-form";
import { useRouter } from "@/i18n/navigation";
import { signInHref } from "@/lib/auth-href";

export default function OnboardingClient() {
  const t = useTranslations("profile");
  const search = useSearchParams();
  const router = useRouter();
  const { user, profile, refreshProfile, loading, isAdmin } = useAuth();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!user || search.get("checkout") !== "success" || synced) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        await fetch("/api/stripe/sync", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) await refreshProfile();
      } catch {
        /* webhook may catch up */
      } finally {
        if (!cancelled) setSynced(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, search, refreshProfile, synced]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(signInHref("/members/onboarding"));
      return;
    }
    if (isAdmin || profile?.onboardingCompleted) {
      router.replace("/members");
    }
  }, [loading, user, profile, isAdmin, router]);

  if (loading || !user) {
    return <p className="py-16 text-center text-ink-soft">…</p>;
  }

  if (isAdmin || profile?.onboardingCompleted) {
    return <p className="py-16 text-center text-ink-soft">…</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {t("onboardingEyebrow")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">
        {t("onboardingTitle")}
      </h1>
      <p className="mt-3 text-ink-soft">{t("onboardingLead")}</p>
      {search.get("checkout") === "success" && (
        <p className="mt-6 border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">
          {t("welcomeCheckout")}
        </p>
      )}
      <div className="mt-10">
        <ProfileForm
          mode="onboarding"
          onSaved={() => router.replace("/members")}
        />
      </div>
    </div>
  );
}
