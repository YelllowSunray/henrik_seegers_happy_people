import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { CmsBlogFeed } from "@/components/cms/cms-blog-feed";
import { JournalChips, JournalNav } from "@/components/journal-nav";
import { JournalAside } from "@/components/journal-aside";
import { buildPageMetadata } from "@/lib/seo";
import { FACEBOOK_HREF } from "@/lib/contact";
import { fetchPublicPosts } from "@/lib/content-firestore";
import { cmsText } from "@/lib/homepage-content";
import { fetchHomepageCmsForLocale } from "@/lib/homepage-content.server";
import {
  BLOG_CATEGORY_KEYS,
  blogYears,
  filterBlogPosts,
  usedBlogCategories,
} from "@/lib/journal";
import { fetchVideosByKind } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

function firstQuery(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

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
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ categorie?: string | string[] }>;
}) {
  const { locale: localeParam } = await params;
  const query = await searchParams;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("blog");
  const journal = await getTranslations("journal");
  const [posts, vlogs, cms] = await Promise.all([
    fetchPublicPosts(),
    fetchVideosByKind("vlog"),
    fetchHomepageCmsForLocale(locale),
  ]);
  const categorie = firstQuery(query.categorie);
  const filtered = filterBlogPosts(posts, categorie);
  const eyebrow = cmsText(cms?.blog.eyebrow, tr("eyebrow"));
  const title = cmsText(cms?.blog.title, tr("title"));
  const facebook = cmsText(cms?.blog.facebook, tr("facebook"));
  const read = cmsText(cms?.blog.read, tr("read"));
  const empty = cmsText(cms?.blog.empty, tr("empty"));

  const chips = [
    { id: "alles", label: journal("all"), href: "/blog", active: !categorie || categorie === "alles" },
    { id: "nieuwste", label: journal("newest"), href: "/blog?categorie=nieuwste", active: categorie === "nieuwste" },
    ...usedBlogCategories(posts).map((id) => ({
      id,
      label: journal(BLOG_CATEGORY_KEYS[id]),
      href: `/blog?categorie=${id}`,
      active: categorie === id,
    })),
    ...blogYears(posts).map((year) => ({
      id: year,
      label: year,
      href: `/blog?categorie=${year}`,
      active: categorie === year,
    })),
  ];

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <JournalNav active="blog" newHref="#nieuwe-blog" />
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
          {title}
        </h1>
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">
            {journal("categories")}
          </p>
          <JournalChips items={chips} />
        </div>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:gap-14">
          <div>
            <a
              href={FACEBOOK_HREF}
              target="_blank"
              rel="noreferrer"
              className="mb-6 inline-flex items-center text-xs font-medium tracking-wide text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              {facebook}
              <span className="ml-1">↗</span>
            </a>
            {filtered.length === 0 && posts.length > 0 ? (
              <p className="text-ink-soft">{journal("emptyCategory")}</p>
            ) : (
              <CmsBlogFeed
                posts={filtered}
                locale={locale}
                readLabel={read}
                emptyLabel={empty}
              />
            )}
          </div>
          <JournalAside locale={locale} posts={posts} vlogs={vlogs} />
        </div>
      </Section>
    </>
  );
}
