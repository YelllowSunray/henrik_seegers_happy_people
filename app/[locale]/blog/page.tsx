import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { LightboxImage } from "@/components/lightbox-image";
import { CmsBlogFeed } from "@/components/cms/cms-blog-feed";
import { CmsField } from "@/components/cms/cms-field";
import { buildPageMetadata } from "@/lib/seo";
import { FACEBOOK_HREF } from "@/lib/contact";
import { fetchPublicPosts } from "@/lib/content-firestore";
import { cmsText } from "@/lib/homepage-content";
import { fetchHomepageCmsForLocale } from "@/lib/homepage-content.server";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tr = await getTranslations({ locale, namespace: "blog" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  const cms = await fetchHomepageCmsForLocale(locale);
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/blog",
    title: cmsText(cms?.blog.title, tr("title")),
    description: meta("description"),
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("blog");
  const tSem = await getTranslations("seminars");
  const [posts, cms] = await Promise.all([
    fetchPublicPosts(),
    fetchHomepageCmsForLocale(locale),
  ]);
  const imageCaption = cmsText(
    cms?.seminars.imageCaption,
    tSem("imageCaption"),
  );
  const eyebrow = cmsText(cms?.blog.eyebrow, tr("eyebrow"));
  const title = cmsText(cms?.blog.title, tr("title"));
  const facebook = cmsText(cms?.blog.facebook, tr("facebook"));
  const read = cmsText(cms?.blog.read, tr("read"));
  const empty = cmsText(cms?.blog.empty, tr("empty"));

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <div className="mb-6 sm:mb-8">
          <CmsField
            path="blog.eyebrow"
            value={eyebrow}
            multiline={false}
            className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
          />
          <CmsField
            path="blog.title"
            value={title}
            as="h1"
            multiline={false}
            className="font-display mt-3 max-w-2xl text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
          />
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <a
              href={FACEBOOK_HREF}
              target="_blank"
              rel="noreferrer"
              className="mb-8 inline-flex items-center text-xs font-medium tracking-wide text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              <CmsField
                path="blog.facebook"
                value={facebook}
                multiline={false}
                className="text-xs font-medium tracking-wide text-ink-soft"
              />
              <span className="ml-1">↗</span>
            </a>
            <CmsBlogFeed
              posts={posts}
              locale={locale}
              readLabel={read}
              emptyLabel={empty}
            />
          </div>

          <div className="lg:sticky lg:top-28">
            <figure>
              <LightboxImage
                src="/images/blog.png"
                alt={tSem("imageAlt")}
                className="aspect-square min-h-[16rem] w-full"
              />
              <CmsField
                path="seminars.imageCaption"
                value={imageCaption}
                as="figcaption"
                className="mt-3 text-sm text-ink-soft"
              />
            </figure>
          </div>
        </div>
      </Section>
    </>
  );
}
