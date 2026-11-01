"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { VlogPlayer } from "@/components/vlog-player";
import { VlogRecorder } from "@/components/vlog-recorder";
import { youtubeIdFromUrl } from "@/components/youtube-embed";
import { cmsAdminFetch } from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import { publishedDateLabel, vlogKindFilter } from "@/lib/journal";
import type { Locale, VideoItem } from "@/lib/types";

const fieldClass =
  "mt-3 w-full rounded-sm border border-dashed border-accent/40 bg-transparent px-3 py-2 text-ink outline-none focus:border-accent";

function watchUrl(videoUrl?: string) {
  if (!videoUrl) return "";
  const id = youtubeIdFromUrl(videoUrl);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
  return videoUrl;
}

function PublishBanner({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
      <p className="font-semibold">Gepubliceerd — het staat nu op de site.</p>
      <Link href={href} className="mt-1 inline-flex font-semibold underline-offset-2 hover:underline">
        {label} →
      </Link>
    </div>
  );
}

function NewVlog({ onCreated }: { onCreated: (video: VideoItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<VideoItem | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setError(null);
    setOpen(false);
  }

  async function publish() {
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    if (!videoUrl.trim()) {
      setError("Neem jezelf op of plak een YouTube-link.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await cmsAdminFetch("/api/admin/videos", {
        method: "POST",
        body: JSON.stringify({ title, description, videoUrl }),
      });
      const data = (await res.json()) as { video?: VideoItem; error?: string };
      if (!res.ok || !data.video) {
        throw new Error(data.error || "Publiceren mislukt");
      }
      onCreated(data.video);
      setPublished(data.video);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publiceren mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="nieuwe-vlog" className="scroll-mt-28">
      {published ? (
        <PublishBanner
          href={`/vlogs/${published.id}`}
          label="Bekijk deze vlog live"
        />
      ) : null}
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setPublished(null);
            setOpen(true);
          }}
          className="mb-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/55 bg-accent/5 px-4 py-3.5 text-sm font-semibold text-accent hover:bg-accent/10"
        >
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
          Nieuwe vlog
        </button>
      ) : (
        <div className="mb-6 rounded-xl border border-dashed border-accent/50 bg-accent/[0.05] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">
              Nieuwe vlog
            </p>
            <button
              type="button"
              onClick={reset}
              className="min-h-10 text-xs font-medium text-ink-soft"
            >
              Annuleren
            </button>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className={`${fieldClass} font-display text-2xl`}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Korte tekst"
            rows={3}
            className={fieldClass}
          />
          <VlogRecorder
            attachedUrl={videoUrl}
            onUploaded={(url) => setVideoUrl(url)}
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Of plak een YouTube-link"
            inputMode="url"
            className={fieldClass}
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void publish()}
              className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Bezig…" : "Publiceren"}
            </button>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function VlogEditor({
  video,
  onChange,
  onDeleted,
}: {
  video: VideoItem;
  onChange: (next: VideoItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(t(video.title, "nl"));
  const [description, setDescription] = useState(t(video.description, "nl"));
  const [videoUrl, setVideoUrl] = useState(watchUrl(video.videoUrl));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    if (!videoUrl.trim()) {
      setError("Neem jezelf op of plak een YouTube-link.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Opslaan…");
    try {
      const res = await cmsAdminFetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, description, videoUrl }),
      });
      const data = (await res.json()) as { videoUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      const nextUrl = data.videoUrl || videoUrl;
      onChange({
        ...video,
        title: { ...video.title, nl: title.trim() },
        description: { ...video.description, nl: description.trim() },
        videoUrl: nextUrl,
        mediaType: "video",
      });
      if (nextUrl) setVideoUrl(watchUrl(nextUrl));
      setStatus("Opgeslagen — zichtbaar op de site");
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Vlog “${title || "zonder titel"}” verwijderen?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await cmsAdminFetch(`/api/admin/videos/${video.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Verwijderen mislukt");
      }
      onDeleted(video.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt");
      setBusy(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-dashed border-accent/40 bg-accent/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Vlog bewerken
        </p>
        <div className="flex items-center gap-2">
          {status ? <span className="text-[11px] text-ink-soft">{status}</span> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Verwijder
          </button>
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel"
        className={`${fieldClass} font-display text-xl`}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Korte tekst"
        rows={2}
        className={fieldClass}
      />
      <VlogRecorder
        attachedUrl={videoUrl}
        onUploaded={(url) => setVideoUrl(url)}
      />
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="Of plak een YouTube-link"
        inputMode="url"
        className={fieldClass}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="min-h-10 rounded-full border border-accent/40 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50"
        >
          Opslaan
        </button>
        <Link
          href={`/vlogs/${video.id}`}
          className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-accent hover:underline"
        >
          Open vlog →
        </Link>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

function VlogIndexCard({
  video,
  locale,
  featured = false,
}: {
  video: VideoItem;
  locale: Locale;
  featured?: boolean;
}) {
  const tr = useTranslations("journal");
  const kind = vlogKindFilter(video);
  const audio = kind === "audio";

  return (
    <article
      className={`overflow-hidden border border-line ${
        featured ? "bg-ink text-white" : "bg-bg-deep/50"
      }`}
    >
      {featured && !audio ? (
        <VlogPlayer
          url={video.videoUrl}
          title={t(video.title, locale)}
          poster={video.thumbnail}
        />
      ) : null}
      <div className="p-5 sm:p-6">
        <p
          className={`text-xs font-semibold tracking-[0.16em] uppercase ${
            featured ? "text-gold" : "text-accent"
          }`}
        >
          {publishedDateLabel(video.publishedAt)}
          {video.durationLabel ? ` · ${video.durationLabel}` : ""}
          {` · ${kind === "audio" ? tr("audio") : tr("video")}`}
        </p>
        <h2
          className={`font-display mt-2 text-2xl sm:text-3xl ${
            featured ? "text-white" : "text-ink"
          }`}
        >
          <Link href={`/vlogs/${video.id}`} className="hover:text-accent">
            {t(video.title, locale)}
          </Link>
        </h2>
        {t(video.description, locale) ? (
          <p
            className={`mt-3 text-sm leading-relaxed ${
              featured ? "text-white/75" : "text-ink-soft"
            }`}
          >
            {t(video.description, locale)}
          </p>
        ) : null}
        <Link
          href={`/vlogs/${video.id}`}
          className={`mt-5 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold ${
            featured
              ? "bg-white text-ink"
              : "bg-accent text-white hover:bg-accent-soft"
          }`}
        >
          {tr("watch")} →
        </Link>
      </div>
    </article>
  );
}

export function CmsVlogDetailEditor({
  video,
}: {
  video: VideoItem;
}) {
  const cms = useCmsOptional();
  if (!cms?.enabled) return null;
  return (
    <div className="mt-8">
      <VlogEditor video={video} onChange={() => {}} onDeleted={() => {}} />
    </div>
  );
}

export function CmsVlogList({
  items,
  locale,
}: {
  items: VideoItem[];
  locale?: Locale;
}) {
  const cms = useCmsOptional();
  const tr = useTranslations("journal");
  const fallbackLocale = useLocale() as Locale;
  const loc = locale ?? fallbackLocale;
  const [videos, setVideos] = useState(items);

  useEffect(() => {
    setVideos(items);
  }, [items]);

  const onCreated = useCallback((video: VideoItem) => {
    setVideos((prev) => [video, ...prev]);
  }, []);

  const onDeleted = useCallback((id: string) => {
    setVideos((prev) => prev.filter((video) => video.id !== id));
  }, []);

  const onChange = useCallback((next: VideoItem) => {
    setVideos((prev) => prev.map((video) => (video.id === next.id ? next : video)));
  }, []);

  const featured = videos[0];
  const rest = videos.slice(1);

  return (
    <div>
      {cms?.enabled ? <NewVlog onCreated={onCreated} /> : null}
      {videos.length === 0 ? (
        <p className="text-ink-soft">{tr("emptyVlogs")}</p>
      ) : (
        <div className="space-y-8">
          {featured ? (
            <div>
              {cms?.enabled ? (
                <VlogEditor
                  video={featured}
                  onChange={onChange}
                  onDeleted={onDeleted}
                />
              ) : null}
              <VlogIndexCard video={featured} locale={loc} featured />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent uppercase">
                {tr("index")}
              </p>
              <ul className="divide-y divide-line border-y border-line">
                {rest.map((video) => (
                  <li key={video.id} className="py-4">
                    {cms?.enabled ? (
                      <VlogEditor
                        video={video}
                        onChange={onChange}
                        onDeleted={onDeleted}
                      />
                    ) : null}
                    <p className="text-xs text-ink-soft">
                      {publishedDateLabel(video.publishedAt)}
                      {video.durationLabel ? ` · ${video.durationLabel}` : ""}
                    </p>
                    <h3 className="font-display mt-1 text-xl text-ink">
                      <Link
                        href={`/vlogs/${video.id}`}
                        className="hover:text-accent"
                      >
                        {t(video.title, loc)}
                      </Link>
                    </h3>
                    <Link
                      href={`/vlogs/${video.id}`}
                      className="mt-2 inline-flex text-sm font-semibold text-accent"
                    >
                      {tr("watch")} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
