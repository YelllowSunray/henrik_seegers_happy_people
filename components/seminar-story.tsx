import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SeminarHeroVideo } from "@/components/seminar-hero-video";
import { SeminarStoryBlocks } from "@/components/seminar-story-blocks";
import { SeminarTicketButton } from "@/components/seminar-ticket-button";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import { formatEventDate, getEventDateLabel, getSeminarContent } from "@/lib/seminar-content";
import { t } from "@/lib/content";
import { fetchEvents } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export async function SeminarStory({
  locale,
  titleAs = "h1",
  titleId,
  returnPath = "/seminars",
  showTicket = true,
  showAllLink = false,
  showSoStrongPlayer = false,
  variant = "full",
}: {
  locale: Locale;
  titleAs?: "h1" | "h2";
  titleId?: string;
  returnPath?: string;
  showTicket?: boolean;
  showAllLink?: boolean;
  showSoStrongPlayer?: boolean;
  variant?: "full" | "home";
}) {
  const tr = await getTranslations("seminars");
  const content = getSeminarContent(locale, variant);
  const events = await fetchEvents();
  const event = events[0];
  const Title = titleAs;
  const ticketOpen = content.ticketSalesOpen && showTicket;

  const eventTitle = event ? t(event.title, locale) : "";
  const eventDate = event
    ? getEventDateLabel(event, locale, tr("dateLaterThisYear"))
    : "";
  const eventTime = event && !event.dateUncertain ? (event.time ?? "") : "";
  const addressLines = event?.address
    ? event.address.split(/,\s*/)
    : [];
  const eventWhen = event
    ? [eventDate, eventTime].filter(Boolean).join(" · ")
    : "";

  const nextEventCard = event ? (
    <div className="border-y border-ink/15 bg-bg-deep px-6 py-10 sm:px-8 md:py-12">
      <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
        {tr("next")}
      </p>
      <h3 className="font-display mt-3 text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl">
        {eventTitle}
      </h3>
      <div className="mt-6">
        <p className="font-display text-2xl leading-snug text-ink md:text-3xl">
          {eventDate}
        </p>
        {eventTime ? (
          <p className="mt-1 text-base text-ink-soft md:text-lg">{eventTime}</p>
        ) : null}
      </div>
      <div className="mt-8 border-l-2 border-gold pl-5">
        <p className="text-base font-medium text-ink md:text-lg">
          {event.location}
        </p>
        {addressLines.map((line) => (
          <p key={line} className="mt-1 text-sm text-ink-soft md:text-base">
            {line}
          </p>
        ))}
      </div>
      {ticketOpen ? (
        <SeminarTicketButton
          className="mt-8"
          eventId={event.id}
          eventTitle={eventTitle}
          eventMeta={[eventWhen, event.location, event.address]
            .filter(Boolean)
            .join(" · ")}
          returnPath={returnPath}
          compact
        />
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <div>
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
          {tr("eyebrow")}
        </p>
        <Title
          id={titleId}
          className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
        >
          {tr("title")}
        </Title>
        <p className="font-display mt-4 text-xl leading-snug text-ink md:text-2xl">
          {content.subtitle}
        </p>

        {nextEventCard ? <div className="mt-10">{nextEventCard}</div> : null}

        <div className="mt-10">
          <SeminarStoryBlocks blocks={content.storyBlocks} />
        </div>

        {event ? (
          <>
            <div className="mt-10">
              <SeminarStoryBlocks blocks={content.eventBlocks} />
            </div>

            {ticketOpen && variant === "full" ? (
              <>
                <SeminarTicketButton
                  className="mt-10"
                  eventId={event.id}
                  eventTitle={eventTitle}
                  eventMeta={[eventWhen, event.location, event.address]
                    .filter(Boolean)
                    .join(" · ")}
                  returnPath={returnPath}
                />
                <p className="mt-6 text-sm text-ink-soft">{tr("missed")}</p>
              </>
            ) : null}
          </>
        ) : null}

        {showSoStrongPlayer && event ? (
          <div className="mt-8 w-full max-w-[32rem]">
            <SyncedLyricPlayer
              audioSrc="/audio/so-strong.mp3"
              lrcSrc="/audio/so-strong.lrc"
              title="So Strong"
              artist="Labi Siffre"
              tone="page"
              compact
              handoffAnchorId={titleId}
            />
          </div>
        ) : null}

        {variant === "home" && showAllLink ? (
          <Link
            href="/seminars"
            className="mt-8 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            {tr("allSeminars")}
          </Link>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-28">
        <SeminarHeroVideo />
      </div>
    </div>
    </>
  );
}
