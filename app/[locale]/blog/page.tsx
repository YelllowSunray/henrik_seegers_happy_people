import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { LightboxImage } from "@/components/lightbox-image";
import { t } from "@/lib/content";
import { FACEBOOK_HREF } from "@/lib/contact";
import { fetchPublicPosts } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const posts = await fetchPublicPosts();

  return (
    <>
      <SiteHeader variant="solid" />
      <Section eyebrow={tr("eyebrow")} title={tr("title")}>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <a
              href={FACEBOOK_HREF}
              target="_blank"
              rel="noreferrer"
              className="mb-8 inline-flex text-xs font-medium tracking-wide text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              {tr("facebook")} ↗
            </a>
            {posts.length === 0 ? (
              <p>{tr("empty")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {posts.map((post) => (
                  <li key={post.id} className="py-8">
                    <p className="text-xs text-ink-soft">{post.publishedAt}</p>
                    <h2 className="font-display mt-2 text-3xl text-ink">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-accent"
                      >
                        {t(post.title, locale)}
                      </Link>
                    </h2>
                    <p className="mt-3 max-w-2xl text-ink-soft">
                      {t(post.excerpt, locale)}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft"
                    >
                      {tr("read")}
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:sticky lg:top-28">
            <figure>
              <LightboxImage
                src="/images/image3.jpg"
                alt={tSem("imageAlt")}
                className="aspect-square min-h-[16rem] w-full"
              />
              <figcaption className="mt-3 text-sm text-ink-soft">
                {tSem("imageCaption")}
              </figcaption>
            </figure>
          </div>
        </div>
      </Section>
    </>
  );
}
