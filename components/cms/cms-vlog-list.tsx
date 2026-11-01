"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
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
import { VlogMediaPick } from "@/components/vlog-media-pick";
import { VlogPlayer } from "@/components/vlog-player";
import { cmsAdminFetch } from "@/lib/cms-admin-fetch";
import { t } from "@/lib/content";
import { publishedDateLabel } from "@/lib/journal";
import { uploadVlogBlob } from "@/lib/vlog-upload";
import type { Locale, VideoItem } from "@/lib/types";

function NewVlog({ onCreated }: { onCreated: (video: VideoItem) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<VideoItem | null>(null);
  const previewRef = useRef<string | null>(null);
  const dirty = Boolean(blob || title.trim() || description.trim());
  useLeaveGuard(open && dirty);

  function revokePreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }

  useEffect(() => () => revokePreview(), []);

  function reset(close = true) {
    revokePreview();
    setBlob(null);
    setPreviewUrl(null);
    setTitle("");
    setDescription("");
    setError(null);
    setProgress(0);
    if (close) setOpen(false);
  }

  function onPicked(next: Blob) {
    revokePreview();
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setBlob(next);
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
    if (!blob) {
      setError("Kies of neem eerst een video op.");
      return;
    }
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    if (!user) {
      setError(
        "Log in met je Happy People-e-mail (Henk) om de video op de site te zetten.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const videoUrl = await uploadVlogBlob(user.uid, blob, setProgress);
      const res = await cmsAdminFetch("/api/admin/videos", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
        }),
      });
      const data = (await res.json()) as { video?: VideoItem; error?: string };
      if (!res.ok || !data.video) {
        throw new Error(data.error || "Publiceren mislukt");
      }
      onCreated(data.video);
      setPublished(data.video);
      reset(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publiceren mislukt");
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
        <AdminNewButton
          onClick={() => {
            setPublished(null);
            setOpen(true);
          }}
        >
          Nieuwe vlog
        </AdminNewButton>
      ) : (
        <div className="rounded-2xl border border-line bg-bg-deep/40 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
                Nieuwe vlog
              </p>
              <p className="mt-1 text-base text-ink-soft">
                Eerst een video, daarna titel en tekst, en dan Publiceren.
              </p>
            </div>
            <AdminGhostButton onClick={close}>Annuleren</AdminGhostButton>
          </div>

          <div className="mt-6 space-y-8">
            <div>
              <p className="text-base font-semibold text-ink">1. Kies je video</p>
              <p className="mt-1 text-sm text-ink-soft">
                Twee keuzes: een bestand van je telefoon, of nu opnemen.
              </p>
              <div className="mt-3">
                {blob && previewUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl bg-ink">
                      <video
                        src={previewUrl}
                        controls
                        playsInline
                        className="aspect-[9/16] w-full bg-black object-contain sm:aspect-video"
                      />
                    </div>
                    <AdminGhostButton onClick={() => reset(false)}>
                      Andere video
                    </AdminGhostButton>
                  </div>
                ) : (
                  <VlogMediaPick onReady={onPicked} />
                )}
              </div>
            </div>

            {blob ? (
              <>
                <AdminField
                  label="2. Titel"
                  hint="De kop die bezoekers zien."
                >
                  <AdminInput
                    value={title}
                    onChange={setTitle}
                    placeholder="Bijvoorbeeld: Een moment van rust"
                  />
                </AdminField>
                <AdminField
                  label="3. Korte tekst"
                  hint="Wat wil je bij de video zeggen? Mag leeg blijven."
                >
                  <AdminTextarea
                    value={description}
                    onChange={setDescription}
                    placeholder="Een paar zinnen is genoeg."
                    minRows={3}
                  />
                </AdminField>
                <AdminPreview label="Zo ziet het eruit">
                  <h2 className="font-display text-2xl leading-tight text-ink">
                    {title.trim() || "Titel"}
                  </h2>
                  {description.trim() ? (
                    <p className="mt-2 text-base leading-relaxed text-ink-soft">
                      {description}
                    </p>
                  ) : null}
                </AdminPreview>
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
  const [replacing, setReplacing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function onPicked(next: Blob) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setBlob(next);
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
      let videoUrl = video.videoUrl;
      if (blob) {
        if (!user) {
          throw new Error(
            "Log in met je Happy People-e-mail (Henk) om een nieuwe video te zetten.",
          );
        }
        videoUrl = await uploadVlogBlob(user.uid, blob, setProgress);
      }
      const res = await cmsAdminFetch(`/api/admin/videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
        }),
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
      setStatus("Opgeslagen — zichtbaar op de site");
      setBlob(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Opslaan mislukt");
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
        ) : (
          <VlogPlayer
            url={video.videoUrl}
            title={title}
            poster={video.thumbnail}
          />
        )}
      </AdminPreview>

      {replacing ? (
        <VlogMediaPick
          onReady={onPicked}
          onCancel={() => setReplacing(false)}
        />
      ) : (
        <AdminGhostButton onClick={() => setReplacing(true)}>
          Andere video
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

function VlogCard({
  video,
  locale,
}: {
  video: VideoItem;
  locale: Locale;
}) {
  const tr = useTranslations("journal");

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      <VlogPlayer
        url={video.videoUrl}
        title={t(video.title, locale)}
        poster={video.thumbnail}
      />
      <div className="p-5 sm:p-6">
        <p className="text-sm text-ink-soft">
          {publishedDateLabel(video.publishedAt)}
          {video.durationLabel ? ` · ${video.durationLabel}` : ""}
        </p>
        <h2 className="font-display mt-2 text-2xl leading-tight text-ink sm:text-3xl">
          <Link href={`/vlogs/${video.id}`} className="hover:text-accent">
            {t(video.title, locale)}
          </Link>
        </h2>
        {t(video.description, locale) ? (
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            {t(video.description, locale)}
          </p>
        ) : null}
        <Link
          href={`/vlogs/${video.id}`}
          className="mt-5 inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-base font-semibold text-white hover:bg-accent-soft"
        >
          {tr("watch")} →
        </Link>
      </div>
    </article>
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

  if (editing) {
    return (
      <li className="rounded-2xl border border-line bg-white p-5 sm:p-6">
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
    <li className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-ink-soft">
        {publishedDateLabel(video.publishedAt)}
      </p>
      <h3 className="font-display mt-1 text-2xl leading-tight text-ink">
        {t(video.title, locale) || "Zonder titel"}
      </h3>
      {t(video.description, locale) ? (
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          {t(video.description, locale)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <AdminPrimaryButton onClick={() => setEditing(true)}>
          Bewerken
        </AdminPrimaryButton>
        <Link
          href={`/vlogs/${video.id}`}
          className="inline-flex min-h-12 items-center rounded-full border border-line px-5 text-base font-medium text-ink-soft"
        >
          Openen
        </Link>
        <AdminDangerButton
          onClick={() => {
            if (!confirmDelete(t(video.title, locale))) return;
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
      </div>
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
      <p className="mt-8 text-base text-ink-soft">Vlog verwijderd.</p>
    );
  }
  return (
    <div className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
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
    setVideos((prev) =>
      prev.map((video) => (video.id === next.id ? next : video)),
    );
  }, []);

  if (cms?.enabled) {
    return (
      <div className="space-y-6">
        <NewVlog onCreated={onCreated} />
        {videos.length === 0 ? (
          <p className="text-base text-ink-soft">{tr("emptyVlogs")}</p>
        ) : (
          <ul className="space-y-4">
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
    return <p className="text-base text-ink-soft">{tr("emptyVlogs")}</p>;
  }

  return (
    <div className="space-y-8">
      {videos.map((video) => (
        <VlogCard key={video.id} video={video} locale={loc} />
      ))}
    </div>
  );
}
