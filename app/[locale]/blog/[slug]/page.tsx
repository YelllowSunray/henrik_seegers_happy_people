import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { BlogBody } from "@/components/blog-body";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import { fetchPostBySlug } from "@/lib/content-firestore";
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

  const title = t(post.title, locale);
  const description = t(post.excerpt, locale);

  return buildPageMetadata({
    locale,
    pathname: `/blog/${slug}`,
    title,
    description,
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
  const post = await fetchPostBySlug(slug);

  if (!post || post.membersOnly) {
    notFound();
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <p className="text-xs text-ink-soft">{post.publishedAt}</p>
        <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl md:text-5xl">
          {t(post.title, locale)}
        </h1>
        <div className="mt-8 sm:mt-10">
          <BlogBody text={t(post.body, locale)} />
        </div>
        <Link
          href="/blog"
          className="mt-12 inline-flex text-sm font-semibold text-accent"
        >
          ← {tr("cta")}
        </Link>
      </Section>
    </>
  );
}
