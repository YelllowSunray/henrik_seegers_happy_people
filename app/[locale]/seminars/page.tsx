import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { events, getVideosByKind, t } from "@/lib/content";
import type { Locale } from "@/lib/types";

export default async function SeminarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("seminars");
  const tMem = await getTranslations("membership");
  const seminars = getVideosByKind("seminar");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section eyebrow={tr("eyebrow")} title={tr("title")}>
        <p className="max-w-2xl text-lg text-ink-soft">{tr("teaser")}</p>

        <div className="mt-12 space-y-8">
          {events.map((event) => (
            <article key={event.id} className="border border-line bg-bg/80 p-5 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                {tr("next")}
              </p>
              <h2 className="font-display mt-2 text-2xl sm:text-3xl md:text-4xl">
                {t(event.title, locale)}
              </h2>
              <p className="mt-3 text-ink-soft">
                {event.location} · {event.date} · {event.time}
              </p>
              <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">
                {t(event.description, locale)}
              </p>
              <p className="mt-6 text-sm text-ink-soft">{tr("missed")}</p>
            </article>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="font-display text-3xl">{tr("membersOnly")}</h2>
          <ul className="mt-6 space-y-3">
            {seminars.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4"
              >
                <div>
                  <p className="font-medium">{t(v.title, locale)}</p>
                  <p className="text-sm text-ink-soft">{v.durationLabel}</p>
                </div>
                <Link href="/members/seminars" className="text-sm text-accent">
                  Happy People →
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <JoinButton label={tMem("cta")} />
          </div>
        </div>
      </Section>
    </>
  );
}
