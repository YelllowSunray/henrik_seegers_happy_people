import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { CmsBlogFeed } from "@/components/cms/cms-blog-feed";
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
  const [posts, cms] = await Promise.all([
    fetchPublicPosts(),
    fetchHomepageCmsForLocale(locale),
  ]);
  const eyebrow = cmsText(cms?.blog.eyebrow, tr("eyebrow"));
  const title = cmsText(cms?.blog.title, tr("title"));
  const facebook = cmsText(cms?.blog.facebook, tr("facebook"));
  const read = cmsText(cms?.blog.read, tr("read"));
  const empty = cmsText(cms?.blog.empty, tr("empty"));

  return (
    <>
      <SiteHeader variant="solid" />
      <Section compact>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">
            {tr("lead")}
          </p>
          <a
            href={FACEBOOK_HREF}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ink-soft underline-offset-4 hover:text-accent hover:underline"
          >
            {facebook}
            <span className="ml-1">↗</span>
          </a>
        </div>
        <div className="mt-10">
          <CmsBlogFeed
            posts={posts}
            locale={locale}
            readLabel={read}
            emptyLabel={empty}
          />
        </div>
      </Section>
    </>
  );
}
