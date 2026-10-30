import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { VideoList } from "@/components/video-list";
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
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("vlogsPage");
  const items = await fetchVideosByKind("vlog");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          {t("lead")}
        </p>
        <div className="mt-10">
          <VideoList items={items} />
        </div>
      </Section>
    </>
  );
}
