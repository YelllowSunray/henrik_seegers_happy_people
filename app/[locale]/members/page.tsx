import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MembersPortalButton } from "@/components/members-portal-button";
import { MembersWelcome } from "@/components/members-welcome";
import { t } from "@/lib/content";
import {
  fetchQuotes,
  fetchVideosByKind,
} from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function MembersHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("members");
  const [seminars, vlogs, quotes] = await Promise.all([
    fetchVideosByKind("seminar"),
    fetchVideosByKind("vlog"),
    fetchQuotes(),
  ]);
  const latestSeminar = seminars[0];
  const latestVlog = vlogs[0];
  const latestQuote = quotes[0];

  return (
    <div>
      <MembersWelcome />

      <p className="mt-10 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("explore")}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClubLink href="/members/seminars" label={tr("seminars")} tone="accent" />
        <ClubLink href="/members/vlogs" label={tr("vlogs")} tone="gold" />
        <ClubLink href="/members/quotes" label={tr("quotes")} tone="accent" />
        <ClubLink href="/members/messages" label={tr("messages")} tone="gold" />
        <ClubLink
          href="/members/teachings"
          label={tr("teachings")}
          tone="accent"
        />
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {latestSeminar && (
          <Link
            href="/members/seminars"
            className="group border border-line bg-bg-deep/40 p-6 transition hover:border-accent"
          >
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {tr("continue")}
            </p>
            <h2 className="font-display mt-2 text-2xl group-hover:text-accent">
              {t(latestSeminar.title, locale)}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {latestSeminar.durationLabel}
            </p>
          </Link>
        )}
        {latestVlog && (
          <Link
            href="/members/vlogs"
            className="group border border-line bg-bg-deep/40 p-6 transition hover:border-accent"
          >
            <p className="text-xs font-semibold tracking-wider text-gold uppercase">
              {tr("vlogs")}
            </p>
            <h2 className="font-display mt-2 text-2xl group-hover:text-accent">
              {t(latestVlog.title, locale)}
            </h2>
          </Link>
        )}
        {latestQuote && (
          <Link
            href="/members/quotes"
            className="border border-line bg-bg-deep/40 p-6 md:col-span-2"
          >
            <p className="text-xs font-semibold tracking-wider text-accent uppercase">
              {tr("quotes")}
            </p>
            <p className="font-display mt-3 text-2xl leading-snug md:text-3xl">
              “{t(latestQuote.text, locale)}”
            </p>
          </Link>
        )}
      </div>

      <MembersPortalButton />
    </div>
  );
}

function ClubLink({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "accent" | "gold";
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border border-line bg-white/50 px-4 py-4 transition hover:border-accent"
    >
      <span className="font-medium text-ink">{label}</span>
      <span
        className={`text-lg ${tone === "gold" ? "text-gold" : "text-accent"}`}
      >
        →
      </span>
    </Link>
  );
}
