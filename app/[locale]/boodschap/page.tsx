import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { SpiritsPlayer } from "@/components/spirits-player";
import { LightboxImage } from "@/components/lightbox-image";
import { CmsField, CmsParagraphs } from "@/components/cms/cms-field";
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
  const t = await getTranslations({ locale, namespace: "message" });
  const cms = await fetchHomepageCmsForLocale(locale);
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/boodschap",
    title: cmsText(cms?.message.title, t("title")),
    description: cmsText(cms?.message.short, t("short")),
  });
}

export default async function MessagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("message");
  const cms = await fetchHomepageCmsForLocale(locale);

  const eyebrow = cmsText(cms?.message.eyebrow, t("eyebrow"));
  const title = cmsText(cms?.message.title, t("title"));
  const short = cmsText(cms?.message.short, t("short"));
  const paragraphs = cmsParagraphs(
    cms?.message.paragraphs,
    t.raw("paragraphs") as string[],
  );

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <CmsField
              path="message.eyebrow"
              value={eyebrow}
              multiline={false}
              className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
            />
            <CmsField
              path="message.title"
              value={title}
              as="h1"
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            />
            <CmsField
              path="message.short"
              value={short}
              as="blockquote"
              className="font-display mt-6 text-xl leading-snug text-ink md:text-3xl"
            />
            <CmsParagraphs
              path="message.paragraphs"
              values={paragraphs}
              className="mt-8 max-w-2xl space-y-5"
              itemClassName="text-base leading-relaxed text-ink-soft md:text-lg"
            />
            <div className="mt-10 w-full max-w-[41rem]">
              <SpiritsPlayer />
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/boodschap.jpg"
              alt={title}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
