import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videoBell" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/video-bell",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function VideoBellPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("videoBell");
  const zoomUrl = process.env.NEXT_PUBLIC_COMMUNITY_ZOOM_URL?.trim() ?? "";

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
        <p className="mt-5 max-w-2xl reading-copy">
          {t("lead")}
        </p>
        <p className="mt-4 max-w-2xl reading-copy reading-copy-ink">
          {t("body")}
        </p>
        <div className="mt-10">
          {zoomUrl ? (
            <a
              href={zoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-white hover:bg-accent-soft"
            >
              {t("join")}
            </a>
          ) : (
            <p className="max-w-xl rounded-xl border border-line bg-white/60 px-4 py-3 text-sm text-ink-soft">
              {t("missing")}
            </p>
          )}
        </div>
      </Section>
    </>
  );
}
