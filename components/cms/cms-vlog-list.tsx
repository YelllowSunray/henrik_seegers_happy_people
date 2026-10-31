"use client";

import { useCallback, useEffect, useState } from "react";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { VideoList } from "@/components/video-list";
import { youtubeIdFromUrl } from "@/components/youtube-embed";
import { cmsAdminFetch } from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import type { VideoItem } from "@/lib/types";

const fieldClass =
  "mt-3 w-full rounded-sm border border-dashed border-accent/40 bg-transparent px-3 py-2 text-ink outline-none focus:border-accent";

function watchUrl(videoUrl?: string) {
  if (!videoUrl) return "";
  const id = youtubeIdFromUrl(videoUrl);
  if (id) return `https://www.youtube.com/watch?v=${id}`;
  return videoUrl;
}

function NewVlog({ onCreated }: { onCreated: (video: VideoItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Plak een YouTube-link.");
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
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publiceren mislukt");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/55 bg-accent/5 px-4 py-3.5 text-sm font-semibold text-accent hover:bg-accent/10"
      >
        <span aria-hidden className="text-lg leading-none">
          +
        </span>
        Nieuwe vlog
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-accent/50 bg-accent/[0.05] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Nieuwe vlog
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-ink-soft"
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
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="YouTube-link"
        inputMode="url"
        className={fieldClass}
      />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void publish()}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Bezig…" : "Publiceren"}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

function VlogEditor({
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
      setError("Plak een YouTube-link.");
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
      const nextUrl = data.videoUrl || video.videoUrl;
      onChange({
        ...video,
        title: { ...video.title, nl: title.trim() },
        description: { ...video.description, nl: description.trim() },
        videoUrl: nextUrl,
        mediaType: "video",
      });
      if (nextUrl) setVideoUrl(watchUrl(nextUrl));
      setStatus("Opgeslagen");
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
      <input
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="YouTube-link"
        inputMode="url"
        className={fieldClass}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full border border-accent/40 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50"
        >
          Opslaan
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}

export function CmsVlogList({ items }: { items: VideoItem[] }) {
  const cms = useCmsOptional();
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

  if (!cms?.enabled) {
    return <VideoList items={videos} />;
  }

  return (
    <div>
      <NewVlog onCreated={onCreated} />
      {videos.length === 0 ? (
        <VideoList items={videos} />
      ) : (
        <div className="space-y-8">
          {videos.map((video, index) => (
            <div key={video.id}>
              <VlogEditor video={video} onChange={onChange} onDeleted={onDeleted} />
              <VideoList items={[video]} highlightFirst={index === 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
