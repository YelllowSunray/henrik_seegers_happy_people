import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { SeminarStory } from "@/components/seminar-story";
import { fetchVideosByKind } from "@/lib/content-firestore";
import { t } from "@/lib/content";
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
  const seminars = await fetchVideosByKind("seminar", { firestoreOnly: true });

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <SeminarStory locale={locale} />

        {seminars.length > 0 ? (
          <div className="mt-16 border-t border-line pt-16">
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
        ) : null}
      </Section>
    </>
  );
}
