import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { BlogBody } from "@/components/blog-body";
import { CmsBlogPostEditor } from "@/components/cms/cms-blog-feed";
import { PostPager } from "@/components/post-pager";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import { fetchPostBySlug, fetchPublicPosts } from "@/lib/content-firestore";
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
  const [post, posts] = await Promise.all([
    fetchPostBySlug(slug),
    fetchPublicPosts(),
  ]);

  if (!post || post.membersOnly) {
    notFound();
  }

  const { prev, next } = neighbors(posts, post.id);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <div className="max-w-3xl">
          <CmsBlogPostEditor post={post} locale={locale}>
            <p className="text-sm text-ink-soft">{post.publishedAt}</p>
            <h1 className="font-display mt-3 text-3xl leading-tight sm:text-4xl md:text-5xl">
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
      </Section>
    </>
  );
}
