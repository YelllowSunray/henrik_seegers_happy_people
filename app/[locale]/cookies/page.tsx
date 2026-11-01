import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/legal-document";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/cookies",
    title: t("cookies"),
    description: t("cookiesLead"),
  });
}

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <LegalDocument locale={locale} slug="cookies" />;
}
