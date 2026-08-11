"use client";

import { useLocale, useTranslations } from "next-intl";
import { t } from "@/lib/content";
import type { Locale, VideoItem } from "@/lib/types";

export function VideoList({ items }: { items: VideoItem[] }) {
  const locale = useLocale() as Locale;
  const tr = useTranslations("members");

  if (items.length === 0) {
    return <p className="text-ink-soft">{tr("emptyContent")}</p>;
  }

  return (
    <ul className="space-y-8">
      {items.map((v, i) => (
        <li
          key={v.id}
          className={`overflow-hidden border border-line ${
            i === 0 ? "bg-ink text-white" : "bg-bg-deep/50"
          }`}
        >
          <div className="grid md:grid-cols-2">
            <div className="order-2 flex flex-col justify-center p-6 md:order-1 md:p-8">
              <p
                className={`text-xs font-semibold tracking-[0.16em] uppercase ${
                  i === 0 ? "text-gold" : "text-accent"
                }`}
              >
                {v.publishedAt}
                {v.durationLabel ? ` · ${v.durationLabel}` : ""}
              </p>
              <h2
                className={`font-display mt-3 text-3xl ${
                  i === 0 ? "text-white" : "text-ink"
                }`}
              >
                {t(v.title, locale)}
              </h2>
              <p
                className={`mt-3 text-sm leading-relaxed ${
                  i === 0 ? "text-white/75" : "text-ink-soft"
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
                    i === 0 ? "bg-white/10 text-white/60" : "bg-ink/5 text-ink-soft"
                  }`}
                >
                  {tr("videoSoon")}
                </div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
