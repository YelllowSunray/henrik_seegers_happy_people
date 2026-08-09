import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { getPostBySlug, posts, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
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
  const post = getPostBySlug(slug);

  if (!post || post.membersOnly) {
    notFound();
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <p className="text-xs text-ink-soft">{post.publishedAt}</p>
        <h1 className="font-display mt-3 max-w-3xl text-4xl md:text-5xl">
          {t(post.title, locale)}
        </h1>
        <p className="mt-10 max-w-2xl text-lg leading-relaxed whitespace-pre-wrap text-ink-soft">
          {t(post.body, locale)}
        </p>
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
