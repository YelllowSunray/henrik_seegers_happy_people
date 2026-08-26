import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomePageClassic } from "@/components/home-page-classic";
import { JsonLd } from "@/components/json-ld";
import { buildPageMetadata, getSiteUrl, SITE_NAME } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/",
    title: t("title"),
    description: t("description"),
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const siteUrl = getSiteUrl();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl}/#website`,
              url: siteUrl,
              name: SITE_NAME,
              inLanguage: locale,
            },
            {
              "@type": "Organization",
              "@id": `${siteUrl}/#organization`,
              name: SITE_NAME,
              url: siteUrl,
              founder: {
                "@type": "Person",
                name: "Hendrik Seegers",
              },
            },
          ],
        }}
      />
      <HomePageClassic locale={locale} />
    </>
  );
}
