import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { CmsVlogList } from "@/components/cms/cms-vlog-list";
import { JournalChips, JournalNav } from "@/components/journal-nav";
import { JournalAside } from "@/components/journal-aside";
import { fetchPublicPosts, fetchVideosByKind } from "@/lib/content-firestore";
import { filterVlogs, vlogYears } from "@/lib/journal";
import { buildPageMetadata } from "@/lib/seo";
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
  const t = await getTranslations({ locale, namespace: "vlogsPage" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/vlogs",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function VlogsPage({
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
  const t = await getTranslations("vlogsPage");
  const journal = await getTranslations("journal");
  const [items, posts] = await Promise.all([
    fetchVideosByKind("vlog"),
    fetchPublicPosts(),
  ]);
  const categorie = firstQuery(query.categorie);
  const filtered = filterVlogs(items, categorie);

  const chips = [
    { id: "alles", label: journal("all"), href: "/vlogs", active: !categorie || categorie === "alles" },
    { id: "nieuwste", label: journal("newest"), href: "/vlogs?categorie=nieuwste", active: categorie === "nieuwste" },
    { id: "video", label: journal("video"), href: "/vlogs?categorie=video", active: categorie === "video" },
    { id: "audio", label: journal("audio"), href: "/vlogs?categorie=audio", active: categorie === "audio" },
    ...vlogYears(items).map((year) => ({
      id: year,
      label: year,
      href: `/vlogs?categorie=${year}`,
      active: categorie === year,
    })),
  ];

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <JournalNav active="vlogs" newHref="#nieuwe-vlog" />
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl reading-copy">{t("lead")}</p>
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">
            {journal("categories")}
          </p>
          <JournalChips items={chips} />
        </div>
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
          <div>
            {filtered.length === 0 && items.length > 0 ? (
              <p className="text-ink-soft">{journal("emptyCategory")}</p>
            ) : (
              <CmsVlogList items={filtered} locale={locale} />
            )}
          </div>
          <JournalAside locale={locale} posts={posts} vlogs={items} />
        </div>
      </Section>
    </>
  );
}
