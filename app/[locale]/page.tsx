import { setRequestLocale } from "next-intl/server";
import { HomePageClassic } from "@/components/home-page-classic";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;

  return <HomePageClassic locale={locale} />;
}
