import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { HomePageClassic } from "@/components/home-page-classic";
import { HomePageClient } from "@/components/home-page-client";
import { HomeVariantBanner } from "@/components/home-variant-banner";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { variant: variantParam } = await searchParams;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const isClientVersion = variantParam === "client";

  return (
    <>
      {isClientVersion ? (
        <HomePageClient locale={locale} />
      ) : (
        <HomePageClassic locale={locale} />
      )}
      <Suspense fallback={null}>
        <HomeVariantBanner />
      </Suspense>
    </>
  );
}