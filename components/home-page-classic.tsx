import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
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
import { CmsField, CmsParagraphs } from "@/components/cms/cms-field";
import { CmsBlogFeed } from "@/components/cms/cms-blog-feed";
import { CmsHeroCtas } from "@/components/cms/cms-hero-ctas";
import { CmsOrExpandable } from "@/components/cms/cms-or-static";
import { FACEBOOK_HREF } from "@/lib/contact";
import { fetchEvents, fetchPublicPosts } from "@/lib/content-firestore";
import {
  cmsParagraphs,
  cmsText,
  type HomepageContent,
} from "@/lib/homepage-content";
import {
  fetchHomepageCmsForLocale,
} from "@/lib/homepage-content.server";
import type { Locale } from "@/lib/types";

export async function HomePageClassic({ locale }: { locale: Locale }) {
  const tNav = await getTranslations("hero");
  const tMsg = await getTranslations("message");
  const tAbout = await getTranslations("about");
  const tSem = await getTranslations("seminars");
  const tBlog = await getTranslations("blog");
  const tMem = await getTranslations("membership");

  const [events, publicPosts, homepageCms] = await Promise.all([
    fetchEvents(),
    fetchPublicPosts(),
    fetchHomepageCmsForLocale(locale),
  ]);
  const cms: HomepageContent | null = homepageCms;
  const nextEvent = events[0];
  const latest = publicPosts.slice(0, 3);

  const hero = {
    brand: cmsText(cms?.hero.brand, tNav("brand")),
    headline: cmsText(cms?.hero.headline, tNav("headline")),
    support: cmsText(cms?.hero.support, tNav("support")),
    ctaJoin: cmsText(cms?.hero.ctaJoin, tNav("ctaJoin")),
    ctaSeminar: cmsText(cms?.hero.ctaSeminar, tNav("ctaSeminar")),
  };
  const message = {
    eyebrow: cmsText(cms?.message.eyebrow, tMsg("eyebrow")),
    title: cmsText(cms?.message.title, tMsg("title")),
    short: cmsText(cms?.message.short, tMsg("short")),
    paragraphs: cmsParagraphs(
      cms?.message.paragraphs,
      tMsg.raw("paragraphs") as string[],
    ),
  };
  const about = {
    eyebrow: cmsText(cms?.about.eyebrow, tAbout("eyebrow")),
    title: cmsText(cms?.about.title, tAbout("title")),
    teaser: cmsText(cms?.about.teaser, tAbout("teaser")),
    paragraphs: cmsParagraphs(
      cms?.about.paragraphs,
      tAbout.raw("paragraphs") as string[],
    ),
    readMore: cmsText(cms?.about.readMore, tAbout("readMore")),
  };
  const imageCaption = cmsText(
    cms?.seminars.imageCaption,
    tSem("imageCaption"),
  );
  const paradisePrompt = cmsText(
    cms?.membership.paradisePrompt,
    tMem("paradisePrompt"),
  );
  const paradiseNote = cmsText(
    cms?.membership.paradiseNote,
    tMem("paradiseNote"),
  );

  return (
    <>
      <SiteHeader variant="hero" />

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
            <CmsField
              path="hero.brand"
              value={hero.brand}
              as="p"
              multiline={false}
              className="reveal font-display text-4xl leading-[1.05] text-white drop-shadow sm:text-5xl md:text-7xl lg:text-8xl"
            />
            <CmsField
              path="hero.headline"
              value={hero.headline}
              as="h1"
              className="reveal reveal-delay-1 mt-1 max-w-xl text-balance text-base leading-snug text-white/95 sm:mt-4 sm:text-lg md:text-xl lg:text-2xl"
            />
            <CmsField
              path="hero.support"
              value={hero.support}
              as="p"
              className="reveal reveal-delay-2 mt-1 max-w-md text-sm leading-snug text-white/80 sm:mt-3 sm:text-base"
            />
            <CmsHeroCtas ctaJoin={hero.ctaJoin} ctaSeminar={hero.ctaSeminar} />
          </div>

          <div className="w-full shrink-0 lg:ml-auto lg:w-auto lg:max-w-[41rem]">
            <MicrochipPlayer handoffAnchorId="hero-title" />
          </div>
        </div>
      </section>

      <Section tone="default" id="message">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <CmsField
              path="message.eyebrow"
              value={message.eyebrow}
              multiline={false}
              className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
            />
            <CmsField
              path="message.title"
              value={message.title}
              as="h2"
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            />
            <CmsField
              path="message.short"
              value={message.short}
              as="blockquote"
              className="font-display mt-6 text-xl leading-snug text-ink md:text-3xl"
            />
            <CmsParagraphs
              path="message.paragraphs"
              values={message.paragraphs}
              className="mt-8 max-w-2xl space-y-5"
              itemClassName="text-base leading-relaxed text-ink-soft md:text-lg"
            />
            <div className="mt-10 w-full max-w-[41rem]">
              <SpiritsPlayer handoffAnchorId="message-title" />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/boodschap.jpg"
              alt={message.title}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      <Section tone="deep" id="about">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <CmsField
              path="about.eyebrow"
              value={about.eyebrow}
              multiline={false}
              className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
            />
            <CmsField
              path="about.title"
              value={about.title}
              as="h2"
              className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
            />
            <CmsField
              path="about.teaser"
              value={about.teaser}
              as="p"
              className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg"
            />
            <CmsOrExpandable
              path="about.paragraphs"
              paragraphs={about.paragraphs}
              readMoreLabel={about.readMore}
              emphasizeFirst
            />
            <CmsField
              path="about.readMore"
              value={about.readMore}
              multiline={false}
              cmsOnly
              label="Lees-meer knop"
              className="mt-3 text-sm font-semibold text-accent"
            />
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
              alt={about.title}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      <Section tone="deep" id="meeting">
        <MeetingStory titleId="meeting-title" cms={cms?.meeting} />
      </Section>

      <Section tone="default" id="seminars">
        <SeminarStory
          locale={locale}
          titleAs="h2"
          titleId="seminars-title"
          returnPath="/"
          showTicket={false}
          showSoStrongPlayer={Boolean(nextEvent)}
          variant="full"
          cms={cms?.seminars}
        />
      </Section>

      <Section tone="deep" id="blog">
        <div className="mb-6 sm:mb-8">
          <CmsField
            path="blog.eyebrow"
            value={cmsText(cms?.blog.eyebrow, tBlog("eyebrow"))}
            multiline={false}
            className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
          />
          <CmsField
            path="blog.title"
            value={cmsText(cms?.blog.title, tBlog("title"))}
            as="h2"
            multiline={false}
            className="font-display mt-3 max-w-2xl text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
          />
        </div>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <a
              href={FACEBOOK_HREF}
              target="_blank"
              rel="noreferrer"
              className="mb-8 inline-flex text-xs font-medium tracking-wide text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              <CmsField
                path="blog.facebook"
                value={cmsText(cms?.blog.facebook, tBlog("facebook"))}
                multiline={false}
                className="text-xs font-medium tracking-wide text-ink-soft"
              />
              <span className="ml-1">↗</span>
            </a>
            <CmsBlogFeed
              posts={latest}
              locale={locale}
              readLabel={cmsText(cms?.blog.read, tBlog("read"))}
              emptyLabel={cmsText(cms?.blog.empty, tBlog("empty"))}
              ctaLabel={cmsText(cms?.blog.cta, tBlog("cta"))}
              limit={3}
              showCta
            />
            <div className="mt-10 w-full max-w-[41rem]">
              <SyncedLyricPlayer
                audioSrc="/audio/run-through-walls.mp3"
                lrcSrc="/audio/run-through-walls.lrc"
                title="Run Through Walls"
                artist="The Script"
                tone="page"
                handoffAnchorId="blog-title"
              />
            </div>
          </div>
          <figure className="min-w-0 lg:max-w-md lg:justify-self-end">
            <LightboxImage
              src="/images/blog.png"
              alt={tSem("imageAlt")}
              className="aspect-square min-h-[16rem] w-full sm:min-h-[20rem]"
            />
            <CmsField
              path="seminars.imageCaption"
              value={imageCaption}
              as="figcaption"
              className="mt-3 text-sm text-ink-soft"
            />
          </figure>
        </div>
      </Section>

      <Section tone="default" id="membership">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <MembershipStory
              titleAs="h2"
              titleId="membership-title"
              cms={cms?.membership}
            />
            <div className="mt-10 w-full max-w-[41rem]">
              <CmsField
                path="membership.paradisePrompt"
                value={paradisePrompt}
                as="p"
                className="mb-4 text-base leading-relaxed text-ink md:text-lg"
              />
              <SyncedLyricPlayer
                audioSrc="/audio/pocketful-of-sunshine.mp3"
                lrcSrc="/audio/pocketful-of-sunshine.lrc"
                title="Pocketful of Sunshine"
                artist="Natasha Bedingfield"
                tone="page"
                handoffAnchorId="membership-title"
              />
              <CmsField
                path="membership.paradiseNote"
                value={paradiseNote}
                as="p"
                className="mt-4 text-sm leading-relaxed text-ink-soft italic md:text-base"
              />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <SpeedGallery />
          </div>
        </div>
      </Section>

      <Section tone="deep">
        <Suspense fallback={null}>
          <DonateSection copy={cms?.donate} />
        </Suspense>
      </Section>
    </>
  );
}
