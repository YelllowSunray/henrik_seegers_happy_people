"use client";

import { useLocale } from "next-intl";
import { t } from "@/lib/content";
import type { Locale, VideoItem } from "@/lib/types";

export function VideoList({ items }: { items: VideoItem[] }) {
  const locale = useLocale() as Locale;

  return (
    <ul className="space-y-4">
      {items.map((v) => (
        <li key={v.id} className="border border-line bg-bg/70 p-5">
          <h2 className="font-display text-2xl">{t(v.title, locale)}</h2>
          <p className="mt-2 text-sm text-ink-soft">{t(v.description, locale)}</p>
          <p className="mt-2 text-xs text-ink-soft">
            {v.publishedAt}
            {v.durationLabel ? ` · ${v.durationLabel}` : ""}
          </p>
          {v.videoUrl ? (
            <div className="mt-4 aspect-video overflow-hidden bg-ink/10">
              <iframe
                src={v.videoUrl}
                title={t(v.title, locale)}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="mt-4 flex aspect-video items-center justify-center bg-ink/5 text-sm text-ink-soft">
              Video placeholder — add URL in admin
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
