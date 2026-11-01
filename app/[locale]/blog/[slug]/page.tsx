import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { BlogBody } from "@/components/blog-body";
import { BlogCover } from "@/components/blog-card";
import { CmsBlogPostEditor } from "@/components/cms/cms-blog-feed";
import { PostPager } from "@/components/post-pager";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import { fetchPostBySlug, fetchPublicPosts } from "@/lib/content-firestore";
import { formatPostDate, neighbors, readingMinutes } from "@/lib/journal";
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
  const tr = await getTranslations("blog");
  const journal = await getTranslations("journal");
  const [post, posts] = await Promise.all([
    fetchPostBySlug(slug),
    fetchPublicPosts(),
  ]);

  if (!post || post.membersOnly) {
    notFound();
  }

  const { prev, next } = neighbors(posts, post.id);
  const title = t(post.title, locale);
  const excerpt = t(post.excerpt, locale);
  const minutes = readingMinutes(title, excerpt, t(post.body, locale));
  const date = formatPostDate(post.publishedAt, locale);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            ← {journal("backToBlog")}
          </Link>
          <CmsBlogPostEditor post={post} locale={locale}>
            <article className="mt-6">
              <div className="overflow-hidden rounded-3xl border border-line">
                <BlogCover post={post} alt="" variant="hero" />
              </div>
              <p className="mt-6 text-sm font-medium text-ink-soft">
                <time dateTime={post.publishedAt}>{date}</time>
                <span aria-hidden> · </span>
                <span>{tr("minutes", { count: minutes })}</span>
              </p>
              <h1 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
                {title}
              </h1>
              {excerpt ? (
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                  {excerpt}
                </p>
              ) : null}
              <div className="mt-8 sm:mt-10">
                <BlogBody text={t(post.body, locale)} />
              </div>
            </article>
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
