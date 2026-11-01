import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { PostPager } from "@/components/post-pager";
import { VlogPlayer } from "@/components/vlog-player";
import { CmsVlogDetailEditor } from "@/components/cms/cms-vlog-list";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import { fetchVideosByKind, fetchVlogById } from "@/lib/content-firestore";
import { formatPostDate, neighbors } from "@/lib/journal";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  const locale = localeParam as Locale;
  const vlog = await fetchVlogById(id);
  if (!vlog) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  return buildPageMetadata({
    locale,
    pathname: `/vlogs/${id}`,
    title: t(vlog.title, locale),
    description: t(vlog.description, locale),
  });
}

export default async function VlogPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const journal = await getTranslations("journal");
  const [vlog, vlogs] = await Promise.all([
    fetchVlogById(id),
    fetchVideosByKind("vlog"),
  ]);

  if (!vlog) notFound();

  const { prev, next } = neighbors(vlogs, vlog.id);
  const audio = vlog.mediaType === "audio" || Boolean(vlog.audioUrl?.trim());
  const title = t(vlog.title, locale);
  const description = t(vlog.description, locale);
  const date = formatPostDate(vlog.publishedAt, locale);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Link
            href="/vlogs"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            ← {journal("backToVlogs")}
          </Link>
          <article className="mt-6">
            <div className="overflow-hidden rounded-3xl border border-line bg-ink">
              {audio && vlog.audioUrl ? (
                <audio
                  controls
                  preload="metadata"
                  src={vlog.audioUrl}
                  className="w-full"
                />
              ) : (
                <VlogPlayer
                  url={vlog.videoUrl}
                  title={title}
                  poster={vlog.thumbnail}
                  eager
                />
              )}
            </div>
            <p className="mt-6 text-sm font-medium text-ink-soft">
              <time dateTime={vlog.publishedAt}>{date}</time>
              {vlog.durationLabel ? (
                <>
                  <span aria-hidden> · </span>
                  <span>{vlog.durationLabel}</span>
                </>
              ) : null}
            </p>
            <h1 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl">
                {description}
              </p>
            ) : null}
          </article>
          <CmsVlogDetailEditor video={vlog} />
          <PostPager
            kind="vlogs"
            prev={
              prev
                ? { href: `/vlogs/${prev.id}`, title: t(prev.title, locale) }
                : undefined
            }
            next={
              next
                ? { href: `/vlogs/${next.id}`, title: t(next.title, locale) }
                : undefined
            }
          />
        </div>
      </Section>
    </>
  );
}
