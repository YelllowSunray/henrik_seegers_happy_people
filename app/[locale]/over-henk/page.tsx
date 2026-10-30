import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { LightboxImage } from "@/components/lightbox-image";
import { CmsField } from "@/components/cms/cms-field";
import { CmsOrExpandable } from "@/components/cms/cms-or-static";
import {
  cmsParagraphs,
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
  const t = await getTranslations({ locale, namespace: "about" });
  const cms = await fetchHomepageCmsForLocale(locale);
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/over-henk",
    title: cmsText(cms?.about.title, t("title")),
    description: cmsText(cms?.about.teaser, t("teaser")),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const cms = await fetchHomepageCmsForLocale(locale);

  const eyebrow = cmsText(cms?.about.eyebrow, t("eyebrow"));
  const title = cmsText(cms?.about.title, t("title"));
  const teaser = cmsText(cms?.about.teaser, t("teaser"));
  const readMore = cmsText(cms?.about.readMore, t("readMore"));
  const paragraphs = cmsParagraphs(
    cms?.about.paragraphs,
    t.raw("paragraphs") as string[],
  );

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <CmsField
              path="about.eyebrow"
              value={eyebrow}
              multiline={false}
              className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
            />
            <CmsField
              path="about.title"
              value={title}
              as="h1"
              multiline={false}
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            />
            <CmsField
              path="about.teaser"
              value={teaser}
              className="mt-4 max-w-2xl reading-copy"
            />
            <CmsOrExpandable
              path="about.paragraphs"
              paragraphs={paragraphs}
              readMoreLabel={readMore}
              emphasizeFirst
            />
            <CmsField
              path="about.readMore"
              value={readMore}
              multiline={false}
              cmsOnly
              label="Lees-meer knop"
              className="mt-4 text-sm font-semibold text-accent"
            />
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/adhd-pic.jpg"
              alt={title}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
