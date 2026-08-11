import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { SubscriptionPanel } from "@/components/subscription-panel";

export default async function MembersSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-soft">…</p>}>
      <SubscriptionPanel />
    </Suspense>
  );
}
