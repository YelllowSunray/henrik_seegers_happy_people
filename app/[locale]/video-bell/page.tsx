import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { SubscriberGate } from "@/components/subscriber-gate";
import { CmsField } from "@/components/cms/cms-field";
import { ZoomMeetingJoin } from "@/components/zoom-meeting-join";
import { cmsText } from "@/lib/homepage-content";
import { fetchHomepageCmsForLocale } from "@/lib/homepage-content.server";
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
  const cms = await fetchHomepageCmsForLocale(locale);
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/video-bell",
    title: cmsText(cms?.zoom.title, t("title")),
    description: cmsText(cms?.zoom.lead, t("lead")),
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
  const cms = await fetchHomepageCmsForLocale(locale);
  const envUrl = process.env.NEXT_PUBLIC_COMMUNITY_ZOOM_URL?.trim() ?? "";

  const eyebrow = cmsText(cms?.zoom.eyebrow, t("eyebrow"));
  const title = cmsText(cms?.zoom.title, t("title"));
  const lead = cmsText(cms?.zoom.lead, t("lead"));
  const body = cmsText(cms?.zoom.body, t("body"));
  const join = cmsText(cms?.zoom.join, t("join"));
  const missing = cmsText(cms?.zoom.missing, t("missing"));
  const url = cmsText(cms?.zoom.url, envUrl);

  return (
    <>
      <SiteHeader variant="solid" />
      <SubscriberGate>
        <Section>
          <CmsField
            path="zoom.eyebrow"
            value={eyebrow}
            multiline={false}
            className="text-sm font-semibold tracking-[0.18em] text-accent uppercase"
          />
          <CmsField
            path="zoom.title"
            value={title}
            as="h1"
            multiline={false}
            className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
          />
          <CmsField
            path="zoom.lead"
            value={lead}
            className="mt-5 max-w-2xl reading-copy"
          />
          <CmsField
            path="zoom.body"
            value={body}
            className="mt-4 max-w-2xl reading-copy reading-copy-ink"
          />
          <div className="mt-10">
            <ZoomMeetingJoin url={url} joinLabel={join} missingLabel={missing} />
          </div>
        </Section>
      </SubscriberGate>
    </>
  );
}
