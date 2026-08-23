import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { MembershipStory } from "@/components/membership-story";
import { DonateSection } from "@/components/donate-section";
import { SpeedGallery } from "@/components/speed-gallery";
import { LightboxImage } from "@/components/lightbox-image";
import { MeetingStory } from "@/components/meeting-story";
import { MicrochipPlayer } from "@/components/microchip-player";
import { SeminarStory } from "@/components/seminar-story";
import { SpiritsPlayer } from "@/components/spirits-player";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import type { Locale } from "@/lib/types";

function asParagraphs(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

export async function HomePageClient({ locale }: { locale: Locale }) {
  const tNav = await getTranslations("hero");
  const tClient = await getTranslations("homeClient");
  const tMem = await getTranslations("membership");

  const messageParagraphs = asParagraphs(tClient.raw("message.paragraphs"));
  const aboutParagraphs = asParagraphs(tClient.raw("about.paragraphs"));
  const journeyParagraphs = asParagraphs(tClient.raw("journey.paragraphs"));
  const twinFlameParagraphs = asParagraphs(tClient.raw("twinFlames.paragraphs"));
  const introParagraphs = asParagraphs(
    tMem.has("introParagraphs") ? tMem.raw("introParagraphs") : [],
  );
  const bridgeParagraphs = asParagraphs(
    tMem.has("bridgeParagraphs") ? tMem.raw("bridgeParagraphs") : [],
  );

  return (
    <>
      <SiteHeader variant="hero" clientHomeNav />

      <section className="relative min-h-[100svh] overflow-hidden">
        <video
          id="hero-video"
          className="absolute inset-0 h-full w-full object-cover object-[center_28%] sm:object-center"
          src="/videos/Siminar_Video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--hero-overlay)" }}
        />
        <div className="relative mx-auto flex min-h-[100svh] w-full flex-col justify-end gap-4 px-5 pb-8 pt-[calc(6rem+env(safe-area-inset-top)+var(--seminar-promo-h,0px))] sm:gap-8 sm:pb-16 sm:pt-[calc(7rem+env(safe-area-inset-top)+var(--seminar-promo-h,0px))] md:px-8 md:pb-24 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-10 lg:pt-[calc(7rem+env(safe-area-inset-top)+var(--seminar-promo-h,0px))] xl:px-14">
          <div className="min-w-0 max-w-6xl lg:max-w-xl xl:max-w-2xl">
            <p className="reveal font-display text-4xl leading-tight text-white drop-shadow sm:whitespace-nowrap sm:text-5xl md:text-7xl lg:text-8xl">
              {tNav("brand")}
            </p>
            <h1
              id="hero-title"
              className="reveal reveal-delay-1 mt-1 max-w-xl text-balance text-base leading-snug text-white/95 sm:mt-4 sm:text-lg md:text-xl lg:text-2xl"
            >
              {tNav("headline")}
            </h1>
            <p className="reveal reveal-delay-2 mt-1 max-w-md text-sm leading-snug text-white/80 sm:mt-3 sm:text-base">
              {tNav("support")}
            </p>
            <div className="reveal reveal-delay-3 mt-3 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <JoinButton
                label={tNav("ctaJoin")}
                className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft sm:px-6 sm:py-3"
              />
              <Link
                href="/seminars"
                className="inline-flex rounded-full border border-white/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10 sm:px-6 sm:py-3"
              >
                {tNav("ctaSeminar")}
              </Link>
            </div>
          </div>

          <div className="w-full shrink-0 lg:ml-auto lg:w-auto lg:max-w-[41rem]">
            <MicrochipPlayer handoffAnchorId="hero-title" />
          </div>
        </div>
      </section>

      {/* 1. De Boodschap */}
      <Section tone="default" id="boodschap">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tClient("message.eyebrow")}
            </p>
            <h2
              id="message-title"
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            >
              {tClient("message.title")}
            </h2>
            <blockquote className="font-display mt-6 text-xl leading-snug text-ink md:text-3xl">
              {tClient("message.subtitle")}
            </blockquote>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
              {tClient("message.opening")}
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {messageParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <blockquote className="font-display mt-10 max-w-2xl border-l-2 border-accent pl-5 text-xl leading-snug text-ink md:text-2xl">
              {tClient("message.closingQuote")}
            </blockquote>
            <div className="mt-10 w-full max-w-[41rem]">
              <SpiritsPlayer handoffAnchorId="message-title" />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/boodschap.jpg"
              alt={tClient("message.title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      {/* 2. Over Henk */}
      <Section tone="deep" id="over-henk">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tClient("about.eyebrow")}
            </p>
            <h2
              id="about-title"
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            >
              {tClient("about.title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              {tClient("about.teaser")}
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {aboutParagraphs.map((paragraph, i) => (
                <p key={paragraph} className={i === 0 ? "text-ink" : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-10 w-full max-w-[41rem]">
              <SyncedLyricPlayer
                audioSrc="/audio/hooponopono.mp3"
                lrcSrc="/audio/hooponopono.lrc"
                title="Ho'oponopono"
                tone="page"
                handoffAnchorId="about-title"
              />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/adhd-pic.jpg"
              alt={tClient("about.title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      {/* 3. De Ontmoeting */}
      <Section tone="deep" id="ontmoeting">
        <MeetingStory
          titleId="meeting-title"
          titleOverride={tClient("meeting.title")}
          teaserBlocks={1}
          readMoreHref="/ontmoeting"
          readMoreLabel={tClient("meeting.readMore")}
        />
      </Section>

      {/* 4. Seminars */}
      <Section tone="default" id="seminars">
        <SeminarStory
          locale={locale}
          titleAs="h2"
          titleId="seminars-title"
          returnPath="/?variant=client"
          showTicket={false}
          showSoStrongPlayer={false}
          copyVariant="client"
          variant="full"
        />
      </Section>

      {/* 5. De Reis terug naar Één */}
      <Section tone="deep" id="reis">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
            {tClient("journey.eyebrow")}
          </p>
          <h2
            id="journey-title"
            className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
          >
            {tClient("journey.title")}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
            {journeyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 w-full max-w-[32rem]">
            <SyncedLyricPlayer
              audioSrc="/audio/so-strong.mp3"
              lrcSrc="/audio/so-strong.lrc"
              title="So Strong"
              artist="Labi Siffre"
              tone="page"
              compact
              handoffAnchorId="journey-title"
            />
          </div>
        </div>
      </Section>

      {/* 6. Blog */}
      <Section
        eyebrow={tClient("blog.eyebrow")}
        title={tClient("blog.title")}
        titleId="blog-title"
        tone="default"
        id="blog"
      >
        <div className="max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
          <p className="text-ink">{tClient("blog.lead")}</p>
          <p>{tClient("blog.body")}</p>
        </div>
      </Section>

      {/* 7. Twin Flames */}
      <Section tone="deep" id="twin-flames">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tClient("twinFlames.eyebrow")}
            </p>
            <h2 className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
              {tClient("twinFlames.title")}
            </h2>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {twinFlameParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <figure className="min-w-0 lg:max-w-md lg:justify-self-end">
            <LightboxImage
              src="/images/blog.png"
              alt={tClient("twinFlames.title")}
              className="aspect-square min-h-[16rem] w-full sm:min-h-[20rem]"
            />
            <figcaption className="mt-3 text-sm text-ink-soft">
              {tClient("twinFlames.imageCaption")}
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 8. Lidmaatschap */}
      <Section tone="default" id="lidmaatschap">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <MembershipStory titleAs="h2" titleId="membership-title" />
          <div className="lg:sticky lg:top-28">
            <SpeedGallery />
          </div>
        </div>
      </Section>

      {/* 9. Steun */}
      <Section tone="deep" id="steun">
        <Suspense fallback={null}>
          <DonateSection />
        </Suspense>
      </Section>

      {/* 10. Happy People */}
      <Section tone="default" id="happy-people">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
            {tClient("happyPeopleClose.eyebrow")}
          </p>
          <h2
            id="happy-people-title"
            className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
          >
            {tClient("happyPeopleClose.title")}
          </h2>
          <div className="mt-8 space-y-3 text-base leading-relaxed text-ink-soft md:text-lg">
            {introParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {bridgeParagraphs.length > 0 ? (
            <div className="mt-8 space-y-3 border-l-2 border-accent pl-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {bridgeParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          <p className="mt-8 text-base leading-relaxed text-ink-soft md:text-lg">
            {tMem("pitch")}
          </p>
          <div className="mt-10 w-full max-w-[41rem]">
            <p className="mb-4 text-base leading-relaxed text-ink md:text-lg">
              {tMem("paradisePrompt")}
            </p>
            <SyncedLyricPlayer
              audioSrc="/audio/pocketful-of-sunshine.mp3"
              lrcSrc="/audio/pocketful-of-sunshine.lrc"
              title="Pocketful of Sunshine"
              artist="Natasha Bedingfield"
              tone="page"
              handoffAnchorId="happy-people-title"
            />
            <p className="mt-4 text-sm leading-relaxed text-ink-soft italic md:text-base">
              {tMem("paradiseNote")}
            </p>
          </div>
          <p className="font-display mt-10 text-xl leading-snug text-ink md:text-2xl">
            {tClient("happyPeopleClose.tagline")}
          </p>
        </div>
      </Section>
    </>
  );
}
