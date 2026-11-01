import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { BlogBody } from "@/components/blog-body";
import { CmsBlogPostEditor } from "@/components/cms/cms-blog-feed";
import { JournalNav } from "@/components/journal-nav";
import { JournalAside } from "@/components/journal-aside";
import { PostPager } from "@/components/post-pager";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import { fetchPostBySlug, fetchPublicPosts, fetchVideosByKind } from "@/lib/content-firestore";
import { neighbors } from "@/lib/journal";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as Locale;
  const post = await fetchPostBySlug(slug);

  if (!post || post.membersOnly) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  return buildPageMetadata({
    locale,
    pathname: `/blog/${slug}`,
    title: t(post.title, locale),
    description: t(post.excerpt, locale),
    type: "article",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const [post, posts, vlogs] = await Promise.all([
    fetchPostBySlug(slug),
    fetchPublicPosts(),
    fetchVideosByKind("vlog"),
  ]);

  if (!post || post.membersOnly) {
    notFound();
  }

  const { prev, next } = neighbors(posts, post.id);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <JournalNav active="blog" />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div>
            <CmsBlogPostEditor post={post} locale={locale}>
              <p className="text-xs text-ink-soft">{post.publishedAt}</p>
              <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl md:text-5xl">
                {t(post.title, locale)}
              </h1>
              <div className="mt-8 sm:mt-10">
                <BlogBody text={t(post.body, locale)} />
              </div>
            </CmsBlogPostEditor>
            <PostPager
              kind="blog"
              prev={
                prev
                  ? { href: `/blog/${prev.slug}`, title: t(prev.title, locale) }
                  : undefined
              }
              next={
                next
                  ? { href: `/blog/${next.slug}`, title: t(next.title, locale) }
                  : undefined
              }
            />
          </div>
          <JournalAside
            locale={locale}
            posts={posts}
            vlogs={vlogs}
            currentId={post.id}
          />
        </div>
      </Section>
    </>
  );
}
