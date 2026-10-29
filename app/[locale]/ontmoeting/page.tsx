import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { MeetingStory } from "@/components/meeting-story";
import {
  cmsText,
} from "@/lib/homepage-content";
import {
  fetchHomepageCmsForLocale,
} from "@/lib/homepage-content.server";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meeting" });
  const cms = await fetchHomepageCmsForLocale(locale);
  const blocks = cms?.meeting.blocks?.length
    ? cms.meeting.blocks
    : (t.raw("blocks") as { text: string }[]);
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/ontmoeting",
    title: cmsText(cms?.meeting.title, t("title")),
    description: blocks[0]?.text ?? cmsText(cms?.meeting.title, t("title")),
  });
}

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cms = await fetchHomepageCmsForLocale(locale);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <MeetingStory titleAs="h1" cms={cms?.meeting} />
      </Section>
    </>
  );
}
