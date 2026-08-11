import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import OnboardingClient from "./onboarding-client";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-soft">…</p>}>
      <OnboardingClient />
    </Suspense>
  );
}
