import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CmsNextEventCard } from "@/components/cms/cms-event-editor";
import { CmsField, CmsParagraphs } from "@/components/cms/cms-field";
import { SeminarHeroVideo } from "@/components/seminar-hero-video";
import { SeminarStoryBlocks } from "@/components/seminar-story-blocks";
import { SeminarTicketButton } from "@/components/seminar-ticket-button";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import { getEventDateLabel, getSeminarContent } from "@/lib/seminar-content";
import { cmsParagraphs, cmsText } from "@/lib/homepage-content";
import type { HomepageContent } from "@/lib/homepage-content";
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
  cms,
}: {
  locale: Locale;
  titleAs?: "h1" | "h2";
  titleId?: string;
  returnPath?: string;
  showTicket?: boolean;
  showAllLink?: boolean;
  showSoStrongPlayer?: boolean;
  variant?: "full" | "home";
  cms?: HomepageContent["seminars"];
}) {
  const tr = await getTranslations("seminars");
  const content = getSeminarContent(locale, variant);
  const subtitle = cmsText(cms?.subtitle, content.subtitle);
  const storyParagraphs = cmsParagraphs(
    cms?.storyParagraphs,
    content.storyBlocks
      .filter((b) => b.type === "paragraph" || b.type === "heading")
      .map((b) => ("text" in b ? b.text : "")),
  );
  const eventParagraphs = cmsParagraphs(
    cms?.eventParagraphs,
    content.eventBlocks
      .filter((b) => b.type === "paragraph" || b.type === "heading")
      .map((b) => ("text" in b ? b.text : "")),
  );
  const useCmsCopy = locale === "nl" && Boolean(cms);
  const events = await fetchEvents();
  const event = events[0];
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

  const nextLabel = cmsText(cms?.next, tr("next"));
  const missed = cmsText(cms?.missed, tr("missed"));
  const allSeminars = cmsText(cms?.allSeminars, tr("allSeminars"));

  const ticketCompact =
    ticketOpen && event ? (
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
    ) : null;

  const nextEventCard = (
    <div className="border-y border-ink/15 bg-bg-deep px-6 py-10 sm:px-8 md:py-12">
      <CmsField
        path="seminars.next"
        value={nextLabel}
        multiline={false}
        className="text-xs font-semibold tracking-[0.18em] text-gold uppercase"
      />
      {event ? (
        <>
          <h3 className="font-display mt-3 text-3xl leading-[1.05] text-ink sm:text-4xl md:text-5xl">
            {eventTitle}
          </h3>
          <div className="mt-6">
            <p className="font-display text-2xl leading-snug text-ink md:text-3xl">
              {eventDate}
            </p>
            {eventTime ? (
              <p className="mt-1 reading-copy">
                {eventTime}
              </p>
            ) : null}
          </div>
          <div className="mt-8 border-l-2 border-gold pl-5">
            <p className="text-base font-medium text-ink md:text-lg">
              {event.location}
            </p>
            {addressLines.map((line) => (
              <p
                key={line}
                className="mt-1 text-sm text-ink-soft md:text-base"
              >
                {line}
              </p>
            ))}
          </div>
          {ticketCompact}
        </>
      ) : (
        <p className="mt-4 text-ink-soft">Nog geen seminar gepland.</p>
      )}
    </div>
  );

  return (
    <>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <div>
        <CmsField
          path="seminars.eyebrow"
          value={cmsText(cms?.eyebrow, tr("eyebrow"))}
          multiline={false}
          className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
        />
        <CmsField
          path="seminars.title"
          value={cmsText(cms?.title, tr("title"))}
          as={titleAs}
          id={titleId}
          multiline={false}
          className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
        />
        <CmsField
          path="seminars.subtitle"
          value={subtitle}
          as="p"
          className="font-display mt-4 text-xl leading-snug text-ink md:text-2xl"
        />

        <div className="mt-10">
          <CmsNextEventCard
            nextLabel={nextLabel}
            laterThisYearLabel={tr("dateLaterThisYear")}
            ticketSlot={ticketCompact}
          >
            {nextEventCard}
          </CmsNextEventCard>
        </div>

        <div className="mt-10">
          {useCmsCopy ? (
            <CmsParagraphs
              path="seminars.storyParagraphs"
              values={storyParagraphs}
              className="max-w-2xl space-y-4"
              itemClassName="reading-copy"
            />
          ) : (
            <SeminarStoryBlocks blocks={content.storyBlocks} />
          )}
        </div>

        {event ? (
          <>
            <div className="mt-10">
              {useCmsCopy ? (
                <CmsParagraphs
                  path="seminars.eventParagraphs"
                  values={eventParagraphs}
                  className="max-w-2xl space-y-4"
                  itemClassName="reading-copy"
                />
              ) : (
                <SeminarStoryBlocks blocks={content.eventBlocks} />
              )}
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
                <CmsField
                  path="seminars.missed"
                  value={missed}
                  className="mt-6 text-sm text-ink-soft"
                />
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
            <CmsField
              path="seminars.allSeminars"
              value={allSeminars}
              multiline={false}
              inline
              className="text-sm font-semibold text-accent"
            />
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
