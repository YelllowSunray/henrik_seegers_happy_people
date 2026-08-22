import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SeminarHeroVideo } from "@/components/seminar-hero-video";
import { SeminarStoryBlocks } from "@/components/seminar-story-blocks";
import { SeminarTicketButton } from "@/components/seminar-ticket-button";
import { formatEventDate, getSeminarContent } from "@/lib/seminar-content";
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
  variant = "full",
}: {
  locale: Locale;
  titleAs?: "h1" | "h2";
  titleId?: string;
  returnPath?: string;
  showTicket?: boolean;
  showAllLink?: boolean;
  variant?: "full" | "home";
}) {
  const tr = await getTranslations("seminars");
  const content = getSeminarContent(locale, variant);
  const events = await fetchEvents();
  const event = events[0];
  const Title = titleAs;

  const eventTitle = event ? t(event.title, locale) : "";
  const eventWhen = event
    ? `${formatEventDate(event.date, locale)} · ${event.time}`
    : "";
  const addressLines = event?.address
    ? event.address.split(/,\s*/)
    : [];

  return (
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

        {event ? (
          <div className="mt-10 border-y border-line py-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              {tr("next")}
            </p>
            <h3 className="font-display mt-2 text-2xl leading-tight text-ink sm:text-3xl md:text-4xl">
              {eventTitle}
            </h3>
            <p className="mt-3 text-base text-ink-soft md:text-lg">{eventWhen}</p>
            <p className="mt-2 font-medium text-ink">{event.location}</p>
            {addressLines.map((line) => (
              <p key={line} className="text-sm text-ink-soft">
                {line}
              </p>
            ))}
            <p className="mt-4 max-w-2xl text-ink-soft">
              {t(event.description, locale)}
            </p>
            <SeminarTicketButton
              className="mt-6"
              eventId={event.id}
              eventTitle={eventTitle}
              eventMeta={[eventWhen, event.location, event.address]
                .filter(Boolean)
                .join(" · ")}
              returnPath={returnPath}
              compact
            />
          </div>
        ) : null}

        <div className="mt-10">
          <SeminarStoryBlocks blocks={content.storyBlocks} />
        </div>

        {variant === "home" && showAllLink ? (
          <Link
            href="/seminars"
            className="mt-8 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            {tr("allSeminars")}
          </Link>
        ) : null}

        {event && variant === "full" ? (
          <div className="mt-14 border-t border-line pt-12">
            <SeminarStoryBlocks blocks={content.eventBlocks} />

            {showTicket ? (
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
          </div>
        ) : null}
      </div>

      <div className="lg:sticky lg:top-28">
        <SeminarHeroVideo />
      </div>
    </div>
  );
}
