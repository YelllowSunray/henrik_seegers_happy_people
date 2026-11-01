import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JournalNav } from "@/components/journal-nav";
import { JournalAside } from "@/components/journal-aside";
import { PostPager } from "@/components/post-pager";
import { VlogPlayer } from "@/components/vlog-player";
import { CmsVlogDetailEditor } from "@/components/cms/cms-vlog-list";
import { buildPageMetadata } from "@/lib/seo";
import { t } from "@/lib/content";
import {
  fetchPublicPosts,
  fetchVideosByKind,
  fetchVlogById,
} from "@/lib/content-firestore";
import { neighbors, publishedDateLabel } from "@/lib/journal";
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
  const [vlog, vlogs, posts] = await Promise.all([
    fetchVlogById(id),
    fetchVideosByKind("vlog"),
    fetchPublicPosts(),
  ]);

  if (!vlog) notFound();

  const { prev, next } = neighbors(vlogs, vlog.id);
  const audio = vlog.mediaType === "audio" || Boolean(vlog.audioUrl?.trim());

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <JournalNav active="vlogs" newHref="/vlogs#nieuwe-vlog" />
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              {publishedDateLabel(vlog.publishedAt)}
              {vlog.durationLabel ? ` · ${vlog.durationLabel}` : ""}
            </p>
            <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl md:text-5xl">
              {t(vlog.title, locale)}
            </h1>
            {t(vlog.description, locale) ? (
              <p className="mt-4 max-w-2xl reading-copy">
                {t(vlog.description, locale)}
              </p>
            ) : null}
            <div className="mt-8 overflow-hidden border border-line">
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
                  title={t(vlog.title, locale)}
                  poster={vlog.thumbnail}
                />
              )}
            </div>
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
          <JournalAside
            locale={locale}
            posts={posts}
            vlogs={vlogs}
            currentId={vlog.id}
          />
        </div>
      </Section>
    </>
  );
}
