"use client";

import { useLocale, useTranslations } from "next-intl";
import { t } from "@/lib/content";
import type { Locale, VideoItem } from "@/lib/types";

function isAudioVlog(v: VideoItem) {
  return (
    v.mediaType === "audio" ||
    Boolean(v.audioUrl?.trim()) ||
    (v.kind === "vlog" && !v.videoUrl?.trim() && Boolean(v.thumbnail?.trim()))
  );
}

export function VideoList({ items }: { items: VideoItem[] }) {
  const locale = useLocale() as Locale;
  const tr = useTranslations("members");

  if (items.length === 0) {
    return <p className="text-ink-soft">{tr("emptyContent")}</p>;
  }

  return (
    <ul className="space-y-8">
      {items.map((v, i) => {
        const featured = i === 0;
        const audio = isAudioVlog(v);
        const text = t(v.body ?? v.description, locale);

        if (audio) {
          return (
            <li
              key={v.id}
              className={`overflow-hidden border border-line ${
                featured ? "bg-ink text-white" : "bg-bg-deep/50"
              }`}
            >
              <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="order-1 md:order-1">
                  {v.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail}
                      alt={t(v.title, locale)}
                      className="aspect-[4/5] w-full object-cover md:aspect-auto md:min-h-full"
                    />
                  ) : (
                    <div
                      className={`flex aspect-[4/5] items-center justify-center text-sm md:min-h-[16rem] ${
                        featured
                          ? "bg-white/10 text-white/60"
                          : "bg-ink/5 text-ink-soft"
                      }`}
                    >
                      {tr("videoSoon")}
                    </div>
                  )}
                </div>
                <div className="order-2 flex flex-col justify-center p-6 md:p-8">
                  <p
                    className={`text-xs font-semibold tracking-[0.16em] uppercase ${
                      featured ? "text-gold" : "text-accent"
                    }`}
                  >
                    {v.publishedAt}
                    {v.durationLabel ? ` · ${v.durationLabel}` : ""}
                  </p>
                  <h2
                    className={`font-display mt-3 text-3xl ${
                      featured ? "text-white" : "text-ink"
                    }`}
                  >
                    {t(v.title, locale)}
                  </h2>
                  {text ? (
                    <p
                      className={`mt-4 whitespace-pre-wrap text-sm leading-relaxed md:text-base ${
                        featured ? "text-white/80" : "text-ink-soft"
                      }`}
                    >
                      {text}
                    </p>
                  ) : null}
                  {v.audioUrl ? (
                    <audio
                      controls
                      preload="metadata"
                      src={v.audioUrl}
                      className="mt-6 w-full"
                    >
                      {tr("audioUnsupported")}
                    </audio>
                  ) : (
                    <p
                      className={`mt-6 text-sm ${
                        featured ? "text-white/60" : "text-ink-soft"
                      }`}
                    >
                      {tr("videoSoon")}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        }

        return (
          <li
            key={v.id}
            className={`overflow-hidden border border-line ${
              featured ? "bg-ink text-white" : "bg-bg-deep/50"
            }`}
          >
            <div className="grid md:grid-cols-2">
              <div className="order-2 flex flex-col justify-center p-6 md:order-1 md:p-8">
                <p
                  className={`text-xs font-semibold tracking-[0.16em] uppercase ${
                    featured ? "text-gold" : "text-accent"
                  }`}
                >
                  {v.publishedAt}
                  {v.durationLabel ? ` · ${v.durationLabel}` : ""}
                </p>
                <h2
                  className={`font-display mt-3 text-3xl ${
                    featured ? "text-white" : "text-ink"
                  }`}
                >
                  {t(v.title, locale)}
                </h2>
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    featured ? "text-white/75" : "text-ink-soft"
                  }`}
                >
                  {t(v.description, locale)}
                </p>
              </div>
              <div className="order-1 md:order-2">
                {v.videoUrl ? (
                  <div className="aspect-video bg-ink/20">
                    <iframe
                      src={v.videoUrl}
                      title={t(v.title, locale)}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div
                    className={`flex aspect-video items-center justify-center text-sm ${
                      featured
                        ? "bg-white/10 text-white/60"
                        : "bg-ink/5 text-ink-soft"
                    }`}
                  >
                    {tr("videoSoon")}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
