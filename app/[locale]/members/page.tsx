import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MembersWelcome } from "@/components/members-welcome";
import { WhatsNewStrip } from "@/components/whats-new-strip";
import { ClubDestinations } from "@/components/club-destinations";
import { DonateThanksBanner } from "@/components/donate-thanks-banner";
import { t } from "@/lib/content";
import {
  fetchMemberPosts,
  fetchPersonalMessages,
  fetchQuotes,
  fetchVideosByKind,
} from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function MembersHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ donate?: string }>;
}) {
  const { locale: localeParam } = await params;
  const { donate } = await searchParams;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("members");
  const [seminars, vlogs, quotes, teachings, messages] = await Promise.all([
    fetchVideosByKind("seminar"),
    fetchVideosByKind("vlog"),
    fetchQuotes(),
    fetchMemberPosts(),
    fetchPersonalMessages(),
  ]);
  const latestSeminar = seminars[0];
  const latestVlog = vlogs[0];
  const latestQuote = quotes[0];

  const destinations = [
    {
      href: "/members/seminars",
      label: tr("seminars"),
      desc: tr("descSeminars"),
      count: seminars.length,
      tone: "accent" as const,
      section: "seminars" as const,
    },
    {
      href: "/members/vlogs",
      label: tr("vlogs"),
      desc: tr("descVlogs"),
      count: vlogs.length,
      tone: "gold" as const,
      section: "vlogs" as const,
    },
    {
      href: "/members/quotes",
      label: tr("quotes"),
      desc: tr("descQuotes"),
      count: quotes.length,
      tone: "accent" as const,
      section: "quotes" as const,
    },
    {
      href: "/members/messages",
      label: tr("messages"),
      desc: tr("descMessages"),
      count: messages.length,
      tone: "gold" as const,
      section: "messages" as const,
    },
    {
      href: "/members/chat",
      label: tr("chat"),
      desc: tr("descChat"),
      count: null as number | null,
      tone: "accent" as const,
      section: "chat" as const,
    },
    {
      href: "/members/teachings",
      label: tr("teachings"),
      desc: tr("descTeachings"),
      count: teachings.length,
      tone: "accent" as const,
      section: "teachings" as const,
    },
  ];

  return (
    <div className="space-y-12 md:space-y-14">
      <DonateThanksBanner show={donate === "success"} />
      <MembersWelcome />
      <WhatsNewStrip />

      {latestSeminar && (
        <section className="reveal reveal-delay-1">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {tr("featured")}
          </p>
          <Link
            href="/members/seminars"
            className="group relative mt-4 block overflow-hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
              style={{ backgroundImage: "url(/images/IMG_1480.jpg)" }}
              aria-hidden
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(100deg, rgba(15,40,36,0.94) 0%, rgba(15,40,36,0.72) 48%, rgba(15,40,36,0.4) 100%)",
              }}
              aria-hidden
            />
            <div className="relative flex min-h-[18rem] flex-col justify-end p-6 md:min-h-[22rem] md:p-10">
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                {tr("continue")}
              </p>
              <h2 className="font-display mt-3 max-w-xl text-3xl text-white md:text-5xl">
                {t(latestSeminar.title, locale)}
              </h2>
              <p className="mt-3 max-w-lg text-sm text-white/75 md:text-base">
                {t(latestSeminar.description, locale)}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition group-hover:bg-gold">
                  {tr("watchNow")}
                </span>
                {latestSeminar.durationLabel && (
                  <span className="text-sm text-white/70">
                    {latestSeminar.durationLabel}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="reveal reveal-delay-2">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              {tr("explore")}
            </p>
            <h2 className="font-display mt-2 text-3xl md:text-4xl">
              {tr("insideTitle")}
            </h2>
          </div>
        </div>
        <ClubDestinations items={destinations} />
      </section>

      {(latestQuote || latestVlog) && (
        <section className="reveal reveal-delay-3 grid gap-6 lg:grid-cols-5">
          {latestQuote && (
            <Link
              href="/members/quotes"
              className="group relative overflow-hidden bg-ink px-6 py-10 text-white md:px-10 md:py-14 lg:col-span-3"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                {tr("latestQuote")}
              </p>
              <p className="font-display mt-6 text-3xl leading-snug md:text-4xl">
                “{t(latestQuote.text, locale)}”
              </p>
              <p className="mt-8 text-sm font-semibold text-gold transition group-hover:text-white">
                {tr("allQuotes")} →
              </p>
            </Link>
          )}
          {latestVlog && (
            <Link
              href="/members/vlogs"
              className="group relative flex min-h-[16rem] flex-col justify-end overflow-hidden lg:col-span-2"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
                style={{ backgroundImage: "url(/images/IMG_1478.jpg)" }}
                aria-hidden
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/15" />
              <div className="relative p-6 md:p-8">
                <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  {tr("vlogs")}
                </p>
                <h3 className="font-display mt-2 text-2xl text-white md:text-3xl">
                  {t(latestVlog.title, locale)}
                </h3>
                <p className="mt-4 text-sm font-semibold text-white/90">
                  {tr("watchNow")} →
                </p>
              </div>
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
