import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { MembershipPlans } from "@/components/membership-plans";
import { DonateSection } from "@/components/donate-section";
import { SpeedGallery } from "@/components/speed-gallery";
import { LightboxImage } from "@/components/lightbox-image";
import { MicrochipPlayer } from "@/components/microchip-player";
import { SpiritsPlayer } from "@/components/spirits-player";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import { SeminarTicketButton } from "@/components/seminar-ticket-button";
import { t } from "@/lib/content";
import { FACEBOOK_HREF } from "@/lib/contact";
import { fetchEvents, fetchPublicPosts } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tNav = await getTranslations("hero");
  const tMsg = await getTranslations("message");
  const tAbout = await getTranslations("about");
  const tSem = await getTranslations("seminars");
  const tBlog = await getTranslations("blog");
  const tMem = await getTranslations("membership");

  const [events, publicPosts] = await Promise.all([
    fetchEvents(),
    fetchPublicPosts(),
  ]);
  const nextEvent = events[0];
  const latest = publicPosts.slice(0, 3);

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
        <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        <div className="relative mx-auto flex min-h-[100svh] w-full flex-col justify-end gap-4 px-5 pb-8 pt-24 sm:gap-8 sm:pb-16 sm:pt-28 md:px-8 md:pb-24 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:px-10 xl:px-14">
          <div className="min-w-0 max-w-6xl lg:max-w-xl xl:max-w-2xl">
            <p className="reveal font-display text-4xl leading-tight text-white drop-shadow sm:whitespace-nowrap sm:text-5xl md:text-7xl lg:text-8xl">
              {tNav("brand")}
            </p>
            <h1 className="reveal reveal-delay-1 mt-1 max-w-xl text-balance text-base leading-snug text-white/95 sm:mt-4 sm:text-lg md:text-xl lg:text-2xl">
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
            <MicrochipPlayer />
          </div>
        </div>
      </section>

      <Section tone="default">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tMsg("eyebrow")}
            </p>
            <h2 className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
              {tMsg("title")}
            </h2>
            <blockquote className="font-display mt-6 text-xl leading-snug text-ink md:text-3xl">
              {tMsg("short")}
            </blockquote>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {(tMsg.raw("paragraphs") as string[]).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-10 w-full max-w-[41rem]">
              <SpiritsPlayer />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/boodschap.jpg"
              alt={tMsg("title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      <Section tone="deep">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tAbout("eyebrow")}
            </p>
            <h2 className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
              {tAbout("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              {tAbout("teaser")}
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {(tAbout.raw("paragraphs") as string[]).map((paragraph, i) => (
                <p key={i} className={i === 0 ? "text-ink" : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
            <div className="mt-10 w-full max-w-[41rem]">
              <SyncedLyricPlayer
                audioSrc="/audio/never-can-say-goodbye.mp3"
                lrcSrc="/audio/never-can-say-goodbye.lrc"
                title="Never Can Say Goodbye"
                artist="Gloria Gaynor"
                tone="page"
              />
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/adhd-pic.jpg"
              alt={tAbout("title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>

      <Section tone="default">
        <div className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tSem("eyebrow")}
            </p>
            <h2 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
              {tSem("title")}
            </h2>
            <p className="mt-6 max-w-xl text-ink-soft">{tSem("teaser")}</p>
            {nextEvent && (
              <div className="mt-10 border-y border-line py-8">
                <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  {tSem("next")}
                </p>
                <h3 className="font-display mt-2 text-3xl">
                  {t(nextEvent.title, locale)}
                </h3>
                <p className="mt-3 text-ink-soft">
                  {nextEvent.date} · {nextEvent.time} · {nextEvent.location}
                </p>
                {nextEvent.address ? (
                  <p className="mt-1 text-sm text-ink-soft">{nextEvent.address}</p>
                ) : null}
                <p className="mt-4 max-w-2xl text-ink-soft">
                  {t(nextEvent.description, locale)}
                </p>
                <p className="mt-3 max-w-2xl text-sm font-medium text-ink">
                  {tSem("refreshments")}
                </p>
                <Link
                  href="/seminars"
                  className="mt-6 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  {tSem("allSeminars")}
                </Link>
              </div>
            )}
          </div>
          <div className="relative aspect-[4/5] min-h-[16rem] overflow-hidden rounded-sm bg-ink/5 sm:min-h-[22rem]">
            <video
              className="absolute inset-0 h-full w-full object-cover object-top"
              src="/videos/Hendrix_BIO.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Hendrik Seegers"
            />
          </div>
        </div>
        {nextEvent && (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <SeminarTicketButton
              className="w-full"
              eventId={nextEvent.id}
              eventTitle={t(nextEvent.title, locale)}
              eventMeta={[
                nextEvent.date,
                nextEvent.time,
                nextEvent.location,
                nextEvent.address,
              ]
                .filter(Boolean)
                .join(" · ")}
              returnPath="/seminars"
              compact
            />
            <SyncedLyricPlayer
              audioSrc="/audio/so-strong.mp3"
              lrcSrc="/audio/so-strong.lrc"
              title="So Strong"
              artist="Labi Siffre"
              tone="page"
            />
          </div>
        )}
      </Section>

      <Section eyebrow={tBlog("eyebrow")} title={tBlog("title")} tone="deep">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-12">
          <div className="min-w-0">
            <a
              href={FACEBOOK_HREF}
              target="_blank"
              rel="noreferrer"
              className="mb-8 inline-flex text-xs font-medium tracking-wide text-ink-soft underline-offset-4 hover:text-accent hover:underline"
            >
              {tBlog("facebook")} ↗
            </a>
            <ul className="space-y-10">
              {latest.map((post) => (
                <li key={post.id} className="min-w-0 max-w-2xl">
                  <p className="text-xs text-ink-soft">{post.publishedAt}</p>
                  <h3 className="font-display mt-2 text-2xl text-ink md:text-3xl">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-accent"
                    >
                      {t(post.title, locale)}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft md:text-base">
                    {t(post.excerpt, locale)}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft"
                  >
                    {tBlog("read")}
                    <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-12 max-w-2xl border-t border-line pt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
              >
                {tBlog("cta")}
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div className="mt-10 w-full max-w-[41rem]">
              <SyncedLyricPlayer
                audioSrc="/audio/hooponopono.mp3"
                lrcSrc="/audio/hooponopono.lrc"
                title="Ho'oponopono"
                tone="page"
              />
            </div>
          </div>
          <figure className="min-w-0 lg:max-w-md lg:justify-self-end">
            <LightboxImage
              src="/images/image3.jpg"
              alt={tSem("imageAlt")}
              className="aspect-square min-h-[16rem] w-full sm:min-h-[20rem]"
            />
            <figcaption className="mt-3 text-sm text-ink-soft">
              {tSem("imageCaption")}
            </figcaption>
          </figure>
        </div>
      </Section>

      <Section tone="default">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {tMem("eyebrow")}
            </p>
            <h2 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
              {tMem("title")}
            </h2>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">{tMem("pitch")}</p>
            <p className="mt-3 max-w-xl text-base italic text-ink">
              {tMem("wordBond")}
            </p>
            <ul className="mt-8 grid gap-3 text-ink-soft sm:grid-cols-2">
              <li>{tMem("benefitSeminars")}</li>
              <li>{tMem("benefitVlogs")}</li>
              <li>{tMem("benefitQuotes")}</li>
              <li>{tMem("benefitTeachings")}</li>
              <li>{tMem("benefitMessages")}</li>
            </ul>
            <MembershipPlans className="mt-10" />
          </div>
          <SpeedGallery />
        </div>
        <div className="mt-10 w-full max-w-[41rem]">
          <p className="mb-4 text-base leading-relaxed text-ink md:text-lg">
            {tMem("paradisePrompt")}
          </p>
          <SyncedLyricPlayer
            audioSrc="/audio/paradise.mp3"
            lrcSrc="/audio/paradise.lrc"
            title="Paradise By The Dashboard Light"
            artist="Meat Loaf"
            tone="page"
          />
          <p className="mt-4 text-sm leading-relaxed text-ink-soft italic md:text-base">
            {tMem("paradiseNote")}
          </p>
        </div>
      </Section>

      <Section tone="deep">
        <Suspense fallback={null}>
          <DonateSection />
        </Suspense>
      </Section>
    </>
  );
}
