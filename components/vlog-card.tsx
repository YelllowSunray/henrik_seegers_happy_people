"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { youtubeThumbnailFromUrl } from "@/components/youtube-embed";
import { t } from "@/lib/content";
import { formatPostDate } from "@/lib/journal";
import type { Locale, VideoItem } from "@/lib/types";

const FALLBACK_COVER = "/images/seminar.png";

export function vlogThumbSrc(video: VideoItem): string {
  const poster = video.thumbnail?.trim();
  if (poster) return poster;
  const fromYoutube = video.videoUrl
    ? youtubeThumbnailFromUrl(video.videoUrl)
    : null;
  return fromYoutube || FALLBACK_COVER;
}

function isLocalSrc(src: string): boolean {
  return src.startsWith("/");
}

export function VlogCover({
  video,
  alt,
  variant = "card",
  className = "",
  showPlay = true,
}: {
  video: VideoItem;
  alt: string;
  variant?: "card" | "featured" | "hero";
  className?: string;
  showPlay?: boolean;
}) {
  const src = vlogThumbSrc(video);
  const local = isLocalSrc(src);
  const frame =
    variant === "hero"
      ? "aspect-video"
      : variant === "featured"
        ? "aspect-video lg:h-full lg:min-h-[22rem] lg:aspect-auto"
        : "aspect-video";

  return (
    <div
      className={`relative overflow-hidden bg-[color-mix(in_srgb,var(--accent)_20%,var(--bg-deep))] ${frame} ${className}`}
    >
      {local ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes={
            variant === "card"
              ? "(max-width: 640px) 100vw, 50vw"
              : "(max-width: 1024px) 100vw, 50vw"
          }
          priority={variant !== "card"}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[rgba(15,40,36,0.42)] via-[rgba(15,40,36,0.08)] to-transparent"
      />
      {showPlay ? (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function VlogPostCard({
  video,
  locale,
  featured = false,
}: {
  video: VideoItem;
  locale: Locale;
  featured?: boolean;
}) {
  const tr = useTranslations("vlogsPage");
  const journal = useTranslations("journal");
  const title = t(video.title, locale) || "Zonder titel";
  const excerpt = t(video.description, locale);
  const date = formatPostDate(video.publishedAt, locale);

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)] transition hover:border-accent/25 hover:shadow-[0_12px_36px_rgba(18,26,24,0.08)] ${
        featured ? "" : "h-full"
      }`}
    >
      <Link
        href={`/vlogs/${video.id}`}
        className={`block ${featured ? "lg:grid lg:min-h-[22rem] lg:grid-cols-2" : ""}`}
      >
        <VlogCover
          video={video}
          alt=""
          variant={featured ? "featured" : "card"}
        />
        <div
          className={`flex flex-col justify-center ${
            featured ? "p-5 sm:p-8 lg:p-10" : "p-5 sm:p-6"
          }`}
        >
          {featured ? (
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              {tr("featured")}
            </p>
          ) : null}
          <p className="text-sm text-ink-soft">
            <time dateTime={video.publishedAt}>{date}</time>
            {video.durationLabel ? (
              <>
                <span aria-hidden> · </span>
                <span>{video.durationLabel}</span>
              </>
            ) : null}
          </p>
          <h2
            className={`font-display mt-2 text-ink group-hover:text-accent ${
              featured
                ? "text-[1.65rem] leading-tight sm:text-3xl md:text-4xl"
                : "text-xl leading-tight sm:text-2xl"
            }`}
          >
            {title}
          </h2>
          {excerpt ? (
            <p
              className={`mt-3 text-ink-soft ${
                featured
                  ? "text-base leading-relaxed sm:text-lg"
                  : "line-clamp-3 text-sm leading-relaxed sm:text-base"
              }`}
            >
              {excerpt}
            </p>
          ) : null}
          <span className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent">
            {journal("watch")}
            <span aria-hidden className="ml-1.5">
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}

export function VlogEmptyState({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)]">
      <div className="relative aspect-video bg-[color-mix(in_srgb,var(--accent)_18%,var(--bg-deep))] sm:aspect-[21/9]">
        <Image
          src={FALLBACK_COVER}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[rgba(15,40,36,0.45)] to-transparent"
        />
      </div>
      <div className="px-5 py-8 text-center sm:px-10 sm:py-12">
        <p className="font-display text-2xl leading-tight text-ink sm:text-3xl">
          {title}
        </p>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
          {hint}
        </p>
      </div>
    </div>
  );
}
