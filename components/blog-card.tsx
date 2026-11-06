"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BlogBody } from "@/components/blog-body";
import { t } from "@/lib/content";
import { formatPostDate, readingMinutes } from "@/lib/journal";
import type { BlogPost, Locale } from "@/lib/types";

const FALLBACK_COVER = "/images/blog.png";

function coverSrc(post: BlogPost): string {
  const src = post.coverImage?.trim();
  return src || FALLBACK_COVER;
}

function isLocalSrc(src: string): boolean {
  return src.startsWith("/");
}

export function BlogCover({
  post,
  alt,
  variant = "card",
  className = "",
}: {
  post: BlogPost;
  alt: string;
  variant?: "card" | "featured" | "hero";
  className?: string;
}) {
  const src = coverSrc(post);
  const local = isLocalSrc(src);
  const frame =
    variant === "hero"
      ? "aspect-[16/10] sm:aspect-[2/1]"
      : variant === "featured"
        ? "aspect-[2/1] sm:aspect-[16/10] lg:h-full lg:min-h-[18rem] lg:aspect-auto"
        : "aspect-[16/10]";

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
        // Remote CMS covers can come from any host — keep them unoptimized.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[rgba(15,40,36,0.38)] via-[rgba(15,40,36,0.08)] to-transparent"
      />
    </div>
  );
}

export function BlogPostCard({
  post,
  locale,
  readLabel,
  featured = false,
}: {
  post: BlogPost;
  locale: Locale;
  readLabel: string;
  featured?: boolean;
}) {
  const tr = useTranslations("blog");
  const title = t(post.title, locale) || "Zonder titel";
  const excerpt = t(post.excerpt, locale);
  const minutes = readingMinutes(
    t(post.title, locale),
    t(post.excerpt, locale),
    t(post.body, locale),
  );
  const date = formatPostDate(post.publishedAt, locale);

  const meta = (
    <p className="text-sm text-ink-soft">
      <time dateTime={post.publishedAt}>{date}</time>
      <span aria-hidden> · </span>
      <span>{tr("minutes", { count: minutes })}</span>
    </p>
  );

  const body = (
    <>
      {featured ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          {tr("featured")}
        </p>
      ) : null}
      {meta}
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
              ? "line-clamp-2 text-base leading-relaxed sm:line-clamp-3 sm:text-lg"
              : "line-clamp-3 text-sm leading-relaxed sm:text-base"
          }`}
        >
          {excerpt}
        </p>
      ) : null}
      <span className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-accent">
        {readLabel}
        <span aria-hidden className="ml-1.5">
          →
        </span>
      </span>
    </>
  );

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)] transition hover:border-accent/25 hover:shadow-[0_12px_36px_rgba(18,26,24,0.08)] ${
        featured ? "" : "h-full"
      }`}
    >
      <Link
        href={`/blog/${post.slug}`}
        className={`block ${featured ? "lg:grid lg:min-h-[22rem] lg:grid-cols-2" : ""}`}
      >
        <BlogCover
          post={post}
          alt=""
          variant={featured ? "featured" : "card"}
        />
        <div
          className={`flex flex-col justify-center ${
            featured ? "p-4 sm:p-8 lg:p-10" : "p-5 sm:p-6"
          }`}
        >
          {body}
        </div>
      </Link>
    </article>
  );
}

/** Full post on the public blog page — no extra click to read it. */
export function BlogPostArticle({
  post,
  locale,
}: {
  post: BlogPost;
  locale: Locale;
}) {
  const tr = useTranslations("blog");
  const title = t(post.title, locale) || "Zonder titel";
  const excerpt = t(post.excerpt, locale);
  const body = t(post.body, locale);
  const minutes = readingMinutes(title, excerpt, body);
  const date = formatPostDate(post.publishedAt, locale);

  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)]">
      <BlogCover post={post} alt="" variant="hero" />
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-sm font-medium text-ink-soft">
          <time dateTime={post.publishedAt}>{date}</time>
          <span aria-hidden> · </span>
          <span>{tr("minutes", { count: minutes })}</span>
        </p>
        <h2 className="font-display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {body.trim() ? (
          <div className="mt-6">
            <BlogBody text={body} className="max-w-none" />
          </div>
        ) : excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}

export function BlogEmptyState({
  title,
  hint,
  facebookLabel,
  facebookHref,
}: {
  title: string;
  hint: string;
  facebookLabel: string;
  facebookHref: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)]">
      <div className="relative aspect-[16/9] bg-[color-mix(in_srgb,var(--accent)_18%,var(--bg-deep))] sm:aspect-[21/9]">
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
        <a
          href={facebookHref}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline-offset-4 hover:underline"
        >
          {facebookLabel}
          <span className="ml-1">↗</span>
        </a>
      </div>
    </div>
  );
}
