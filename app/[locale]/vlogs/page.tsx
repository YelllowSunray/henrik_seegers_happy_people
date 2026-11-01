import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { CmsVlogList } from "@/components/cms/cms-vlog-list";
import { fetchVideosByKind } from "@/lib/content-firestore";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "vlogsPage" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/vlogs",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function VlogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const t = await getTranslations("vlogsPage");
  const items = await fetchVideosByKind("vlog");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section compact>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            {t("lead")}
          </p>
        </div>
        <div className="mt-10">
          <CmsVlogList items={items} locale={locale} />
        </div>
      </Section>
    </>
  );
}
