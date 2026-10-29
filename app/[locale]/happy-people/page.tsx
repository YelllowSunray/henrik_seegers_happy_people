import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { MembershipStory } from "@/components/membership-story";
import { LightboxImage } from "@/components/lightbox-image";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import { CmsField } from "@/components/cms/cms-field";
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
  const t = await getTranslations({ locale, namespace: "membership" });
  const intro = t.raw("introParagraphs") as string[];
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/happy-people",
    title: t("title"),
    description: intro[0] ?? t("subtitle"),
  });
}

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("membership");
  const cms = await fetchHomepageCmsForLocale(locale);
  const paradisePrompt = cmsText(
    cms?.membership.paradisePrompt,
    t("paradisePrompt"),
  );
  const paradiseNote = cmsText(
    cms?.membership.paradiseNote,
    t("paradiseNote"),
  );

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <MembershipStory
              titleAs="h1"
              plansClassName="mt-12"
              cms={cms?.membership}
            />
            <div className="mt-10 w-full max-w-[41rem]">
              <CmsField
                path="membership.paradisePrompt"
                value={paradisePrompt}
                className="mb-4 text-base leading-relaxed text-ink md:text-lg"
              />
              <SyncedLyricPlayer
                audioSrc="/audio/pocketful-of-sunshine.mp3"
                lrcSrc="/audio/pocketful-of-sunshine.lrc"
                title="Pocketful of Sunshine"
                artist="Natasha Bedingfield"
                tone="page"
              />
              <CmsField
                path="membership.paradiseNote"
                value={paradiseNote}
                className="mt-4 text-sm leading-relaxed text-ink-soft italic md:text-base"
              />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/image2.jpg"
              alt={t("title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
