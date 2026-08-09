import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { t } from "@/lib/content";
import { fetchPublicPosts } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("blog");
  const posts = await fetchPublicPosts();

  return (
    <>
      <SiteHeader variant="solid" />
      <Section eyebrow={tr("eyebrow")} title={tr("title")}>
        {posts.length === 0 ? (
          <p>{tr("empty")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.id} className="py-8">
                <Link href={`/blog/${post.slug}`} className="group block">
                  <p className="text-xs text-ink-soft">{post.publishedAt}</p>
                  <h2 className="font-display mt-2 text-3xl group-hover:text-accent">
                    {t(post.title, locale)}
                  </h2>
                  <p className="mt-3 max-w-2xl text-ink-soft">
                    {t(post.excerpt, locale)}
                  </p>
                  <span className="mt-4 inline-block text-sm font-semibold text-accent">
                    {tr("read")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
