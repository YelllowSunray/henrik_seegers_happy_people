"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AdminCardActions,
  AdminCardOpenLink,
  AdminDangerButton,
  AdminField,
  AdminGhostButton,
  AdminInput,
  AdminNewButton,
  AdminPreview,
  AdminPrimaryButton,
  AdminSaveStatus,
  AdminSuccess,
  AdminTextarea,
  confirmDelete,
  confirmLeave,
  useLeaveGuard,
} from "@/components/cms/admin-ui";
import { useCmsOptional } from "@/components/cms/cms-provider";
import { useAuth } from "@/components/auth-provider";
import { VlogEmptyState, VlogPostCard } from "@/components/vlog-card";
import {
  openVlogCamera,
  VlogMediaPick,
  type VlogMediaSource,
} from "@/components/vlog-media-pick";
import { VlogPlayer } from "@/components/vlog-player";
import { youtubeThumbSrc } from "@/components/youtube-embed";
import {
  adminSaveError,
  cmsAdminFetch,
  isAdminCreateSuccess,
  readAdminJson,
  type AdminJson,
} from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import { formatPostDate } from "@/lib/journal";
import { uploadVlogBlob } from "@/lib/vlog-upload";
import type { Locale, VideoItem } from "@/lib/types";

function NewVlog({ onCreated }: { onCreated: (video: VideoItem) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [camera, setCamera] = useState<MediaStream | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtube, setYoutube] = useState<{ url: string; id: string } | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<VideoItem | null>(null);
  const previewRef = useRef<string | null>(null);
  const hasMedia = Boolean(blob || youtube);
  const dirty = Boolean(hasMedia || title.trim() || description.trim());
  useLeaveGuard(open && dirty);

  function revokePreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }

  useEffect(() => () => revokePreview(), []);

  function stopCamera(stream: MediaStream | null) {
    stream?.getTracks().forEach((track) => track.stop());
  }

  function reset(close = true) {
    revokePreview();
    stopCamera(camera);
    setCamera(null);
    setBlob(null);
    setPreviewUrl(null);
    setYoutube(null);
    setTitle("");
    setDescription("");
    setError(null);
    setProgress(0);
    if (close) setOpen(false);
  }

  async function openRecorder() {
    if (opening) return;
    setPublished(null);
    setError(null);
    setOpening(true);
    try {
      const stream = await openVlogCamera();
      setCamera(stream);
      setCameraKey((key) => key + 1);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera starten lukte niet.");
    } finally {
      setOpening(false);
    }
  }

  async function retake() {
    setError(null);
    try {
      const stream = await openVlogCamera();
      stopCamera(camera);
      revokePreview();
      setBlob(null);
      setPreviewUrl(null);
      setYoutube(null);
      setCamera(stream);
      setCameraKey((key) => key + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera starten lukte niet.");
    }
  }

  function onPicked(source: VlogMediaSource) {
    revokePreview();
    if (source.type === "youtube") {
      setBlob(null);
      setPreviewUrl(null);
      setYoutube({ url: source.url, id: source.id });
      setError(null);
      return;
    }
    const url = URL.createObjectURL(source.blob);
    previewRef.current = url;
    setYoutube(null);
    setBlob(source.blob);
    setPreviewUrl(url);
    setError(null);
  }

  function close() {
    if (!confirmLeave(dirty, "Je vlog is nog niet gepubliceerd. Toch sluiten?")) {
      return;
    }
    reset(true);
  }

  async function publish() {
    if (!hasMedia) {
      setError("Neem eerst een video op.");
      return;
    }
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    if (blob && !user) {
      setError(
        "Log in met je Happy People-e-mail (Henk) om de video op de site te zetten.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const videoUrl = youtube
        ? youtube.url
        : await uploadVlogBlob(user!.uid, blob!, setProgress);
      const thumbnail = youtube ? youtubeThumbSrc(youtube.id) : undefined;
      const res = await cmsAdminFetch("/api/admin/videos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          thumbnail,
        }),
      });
      const data = await readAdminJson<AdminJson & { video?: VideoItem }>(res);
      if (!isAdminCreateSuccess(res, data, "vlog") || !data.video) {
        throw new Error(adminSaveError(res, data, "vlog"));
      }
      onCreated(data.video);
      setPublished(data.video);
      reset(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Publiceren mislukt. De vlog is niet opgeslagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="nieuwe-vlog" className="scroll-mt-28">
      {published ? (
        <AdminSuccess
          href={`/vlogs/${published.id}`}
          linkLabel="Bekijk deze vlog live"
        >
          Gepubliceerd — het staat nu op de site.
        </AdminSuccess>
      ) : null}
      {!open ? (
        <>
          <AdminNewButton onClick={() => void openRecorder()}>
            {opening ? "Camera starten…" : "Nieuwe vlog"}
          </AdminNewButton>
          {error ? <p className="mt-3 text-base text-red-700">{error}</p> : null}
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-bg-deep/40 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
              Nieuwe vlog
            </p>
            <AdminGhostButton onClick={close}>Annuleren</AdminGhostButton>
          </div>

          <div className="mt-6 space-y-8">
            <div>
              {youtube ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl">
                    <VlogPlayer
                      url={youtube.url}
                      title={title.trim() || "YouTube"}
                      poster={youtubeThumbSrc(youtube.id)}
                      eager
                    />
                  </div>
                  <AdminGhostButton onClick={() => void retake()}>
                    Opnieuw opnemen
                  </AdminGhostButton>
                </div>
              ) : blob && previewUrl ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-2xl bg-ink">
                    <video
                      src={previewUrl}
                      controls
                      playsInline
                      className="mx-auto aspect-[9/16] max-h-[calc(100dvh-18rem)] w-full bg-black object-contain"
                    />
                  </div>
                  <AdminGhostButton onClick={() => void retake()}>
                    Opnieuw opnemen
                  </AdminGhostButton>
                </div>
              ) : (
                <VlogMediaPick
                  key={cameraKey}
                  initialStream={camera}
                  onReady={onPicked}
                  onCancel={close}
                />
              )}
            </div>

            {hasMedia ? (
              <>
                <AdminField label="Titel">
                  <AdminInput
                    value={title}
                    onChange={setTitle}
                    placeholder="Bijvoorbeeld: Een moment van rust"
                  />
                </AdminField>
                <AdminField label="Korte tekst">
                  <AdminTextarea
                    value={description}
                    onChange={setDescription}
                    placeholder="Een paar zinnen is genoeg."
                    minRows={3}
                  />
                </AdminField>
                {error ? <p className="text-base text-red-700">{error}</p> : null}
                {busy ? (
                  <p className="text-base font-medium text-ink">
                    Uploaden… {progress}%
                  </p>
                ) : null}
                <AdminPrimaryButton busy={busy} onClick={() => void publish()}>
                  {busy ? "Bezig…" : "Publiceren"}
                </AdminPrimaryButton>
              </>
            ) : error ? (
              <p className="text-base text-red-700">{error}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function VlogEditForm({
  video,
  onChange,
  onDeleted,
  onClose,
}: {
  video: VideoItem;
  onChange: (next: VideoItem) => void;
  onDeleted: (id: string) => void;
  onClose?: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(t(video.title, "nl"));
  const [description, setDescription] = useState(t(video.description, "nl"));
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [youtube, setYoutube] = useState<{ url: string; id: string } | null>(
    null,
  );
  const [replacing, setReplacing] = useState(false);
  const [replaceStream, setReplaceStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function onPicked(source: VlogMediaSource) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    if (source.type === "youtube") {
      setBlob(null);
      setPreviewUrl(null);
      setYoutube({ url: source.url, id: source.id });
      setReplacing(false);
      setError(null);
      return;
    }
    const url = URL.createObjectURL(source.blob);
    previewRef.current = url;
    setYoutube(null);
    setBlob(source.blob);
    setPreviewUrl(url);
    setReplacing(false);
    setError(null);
  }

  async function save() {
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus("Opslaan…");
    try {
      let videoUrl = youtube?.url ?? video.videoUrl;
      let thumbnail = youtube ? youtubeThumbSrc(youtube.id) : video.thumbnail;
      if (blob) {
        if (!user) {
          throw new Error(
            "Log in met je Happy People-e-mail (Henk) om een nieuwe video te zetten.",
          );
        }
        videoUrl = await uploadVlogBlob(user.uid, blob, setProgress);
        thumbnail = undefined;
      }
      const res = await cmsAdminFetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          thumbnail: thumbnail ?? "",
        }),
      });
      const data = await readAdminJson<AdminJson & { videoUrl?: string }>(res);
      if (!res.ok || !data.ok) {
        throw new Error(adminSaveError(res, data, "vlog"));
      }
      const nextUrl = data.videoUrl || videoUrl;
      onChange({
        ...video,
        title: { ...video.title, nl: title.trim() },
        description: { ...video.description, nl: description.trim() },
        videoUrl: nextUrl,
        thumbnail,
        mediaType: "video",
      });
      setStatus("Opgeslagen — zichtbaar op de site");
      setBlob(null);
      setYoutube(null);
    } catch (err) {
      setStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : "Opslaan mislukt. De vlog is niet opgeslagen.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete(title)) return;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSaveStatus status={status} />
        <div className="flex flex-wrap gap-2">
          {onClose ? (
            <AdminGhostButton onClick={onClose}>Klaar</AdminGhostButton>
          ) : null}
          <AdminDangerButton disabled={busy} onClick={() => void remove()}>
            Verwijderen
          </AdminDangerButton>
        </div>
      </div>

      <AdminPreview label="Huidige video">
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            playsInline
            className="aspect-video w-full rounded-xl bg-black object-contain"
          />
        ) : youtube ? (
          <VlogPlayer
            url={youtube.url}
            title={title}
            poster={youtubeThumbSrc(youtube.id)}
            eager
          />
        ) : (
          <VlogPlayer
            url={video.videoUrl}
            title={title}
            poster={video.thumbnail}
            eager
          />
        )}
      </AdminPreview>

      {replacing ? (
        <VlogMediaPick
          initialStream={replaceStream}
          onReady={onPicked}
          onCancel={() => {
            replaceStream?.getTracks().forEach((track) => track.stop());
            setReplaceStream(null);
            setReplacing(false);
          }}
        />
      ) : (
        <AdminGhostButton
          onClick={() => {
            void (async () => {
              try {
                const stream = await openVlogCamera();
                setReplaceStream(stream);
                setReplacing(true);
                setError(null);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Camera starten lukte niet.",
                );
              }
            })();
          }}
        >
          Opnieuw opnemen
        </AdminGhostButton>
      )}

      <AdminField label="Titel">
        <AdminInput value={title} onChange={setTitle} placeholder="Titel" />
      </AdminField>
      <AdminField label="Korte tekst">
        <AdminTextarea
          value={description}
          onChange={setDescription}
          placeholder="Een paar zinnen is genoeg."
          minRows={3}
        />
      </AdminField>
      {error ? <p className="text-base text-red-700">{error}</p> : null}
      {busy && blob ? (
        <p className="text-base font-medium text-ink">Uploaden… {progress}%</p>
      ) : null}
      <AdminPrimaryButton busy={busy} onClick={() => void save()}>
        {busy ? "Bezig…" : "Opslaan"}
      </AdminPrimaryButton>
    </div>
  );
}

function CmsVlogRow({
  video,
  locale,
  onChange,
  onDeleted,
}: {
  video: VideoItem;
  locale: Locale;
  onChange: (next: VideoItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const title = t(video.title, locale) || "Zonder titel";
  const excerpt = t(video.description, locale);
  const date = formatPostDate(video.publishedAt, locale) || "Concept";

  if (editing) {
    return (
      <li className="rounded-3xl border border-line bg-white p-5 sm:p-6">
        <VlogEditForm
          video={video}
          onChange={(next) => {
            onChange(next);
            setEditing(false);
          }}
          onDeleted={onDeleted}
          onClose={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_8px_28px_rgba(18,26,24,0.05)]">
      <VlogPlayer url={video.videoUrl} title={title} poster={video.thumbnail} />
      <div className="px-4 py-4 sm:px-5">
        <p className="text-sm text-ink-soft">
          <time dateTime={video.publishedAt}>{date}</time>
          {video.durationLabel ? (
            <>
              <span aria-hidden> · </span>
              <span>{video.durationLabel}</span>
            </>
          ) : null}
        </p>
        <h3 className="font-display mt-1 text-2xl leading-tight text-ink">
          {title}
        </h3>
        {excerpt ? (
          <p className="mt-2 text-base leading-relaxed text-ink-soft">{excerpt}</p>
        ) : null}
      </div>
      <AdminCardActions>
        <AdminPrimaryButton compact onClick={() => setEditing(true)}>
          Bewerken
        </AdminPrimaryButton>
        <AdminCardOpenLink href={`/vlogs/${video.id}`}>
          Openen
        </AdminCardOpenLink>
        <AdminDangerButton
          compact
          onClick={() => {
            if (!confirmDelete(title)) return;
            void (async () => {
              const res = await cmsAdminFetch(`/api/admin/videos/${video.id}`, {
                method: "DELETE",
              });
              if (res.ok) onDeleted(video.id);
            })();
          }}
        >
          Verwijderen
        </AdminDangerButton>
      </AdminCardActions>
    </li>
  );
}

export function CmsVlogDetailEditor({
  video,
}: {
  video: VideoItem;
}) {
  const cms = useCmsOptional();
  const [gone, setGone] = useState(false);
  if (!cms?.enabled) return null;
  if (gone) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-soft">Vlog verwijderd.</p>
        <Link
          href="/vlogs"
          className="mt-4 inline-flex min-h-12 items-center text-base font-semibold text-accent"
        >
          ← Terug naar vlogs
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 rounded-3xl border border-line bg-white p-5 sm:p-6">
      <VlogEditForm
        video={video}
        onChange={() => {}}
        onDeleted={() => setGone(true)}
      />
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
  const page = useTranslations("vlogsPage");
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
    setVideos((prev) =>
      prev.map((video) => (video.id === next.id ? next : video)),
    );
  }, []);

  if (cms?.enabled) {
    return (
      <div className="space-y-6">
        <NewVlog onCreated={onCreated} />
        {videos.length === 0 ? (
          <VlogEmptyState title={page("emptyTitle")} hint={page("emptyHint")} />
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-8">
            {videos.map((video) => (
              <CmsVlogRow
                key={video.id}
                video={video}
                locale={loc}
                onChange={onChange}
                onDeleted={onDeleted}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <VlogEmptyState title={page("emptyTitle")} hint={page("emptyHint")} />
    );
  }

  return (
    <ul className="mx-auto flex max-w-3xl flex-col gap-8">
      {videos.map((video) => (
        <li key={video.id} className="min-w-0">
          <VlogPostCard video={video} locale={loc} />
        </li>
      ))}
    </ul>
  );
}
