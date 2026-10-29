import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { SeminarStory } from "@/components/seminar-story";
import { LightboxImage } from "@/components/lightbox-image";
import { CmsField } from "@/components/cms/cms-field";
import { buildPageMetadata } from "@/lib/seo";
import { fetchVideosByKind } from "@/lib/content-firestore";
import { cmsText } from "@/lib/homepage-content";
import { fetchHomepageCmsForLocale } from "@/lib/homepage-content.server";
import { t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = await getTranslations({ locale, namespace: "seminars" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/seminars",
    title: tr("title"),
    description: tr("teaser"),
  });
}

export default async function SeminarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("seminars");
  const tMem = await getTranslations("membership");
  const [seminars, cms] = await Promise.all([
    fetchVideosByKind("seminar", { firestoreOnly: true }),
    fetchHomepageCmsForLocale(locale),
  ]);
  const imageCaption = cmsText(
    cms?.seminars.imageCaption,
    tr("imageCaption"),
  );
  const ctaJoin = cmsText(cms?.hero.ctaJoin, tMem("cta"));

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <SeminarStory locale={locale} cms={cms?.seminars} />

        <figure className="mt-14 max-w-md">
          <LightboxImage
            src="/images/blog.png"
            alt={tr("imageAlt")}
            className="aspect-square min-h-[16rem] w-full"
          />
          <CmsField
            path="seminars.imageCaption"
            value={imageCaption}
            as="figcaption"
            className="mt-3 text-sm text-ink-soft"
          />
        </figure>

        {seminars.length > 0 ? (
          <div className="mt-16 border-t border-line pt-16">
            <CmsField
              path="seminars.membersOnly"
              value={cmsText(cms?.seminars.membersOnly, tr("membersOnly"))}
              as="h2"
              multiline={false}
              className="font-display text-3xl"
            />
            <ul className="mt-6 space-y-3">
              {seminars.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4"
                >
                  <div>
                    <p className="font-medium">{t(v.title, locale)}</p>
                    <p className="text-sm text-ink-soft">{v.durationLabel}</p>
                  </div>
                  <Link href="/members/seminars" className="text-sm text-accent">
                    Happy People →
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <JoinButton label={ctaJoin} />
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
