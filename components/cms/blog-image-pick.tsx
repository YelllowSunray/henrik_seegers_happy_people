"use client";

import { useRef, useState, type DragEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { AdminGhostButton } from "@/components/cms/admin-ui";
import { uploadBlogImage, type BlogImageKind } from "@/lib/blog-image-upload";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-accent transition-[width]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function useImageUpload(kind: BlogImageKind) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    if (!user) {
      setError(
        "Log in met je Happy People-e-mail (Henk) om een foto op de site te zetten.",
      );
      return null;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      return await uploadBlogImage(user.uid, file, kind, setProgress);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Uploaden mislukt. Probeer het opnieuw.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, progress, error };
}

function DropZone({
  label,
  hint,
  busy,
  onFile,
}: {
  label: string;
  hint: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  function take(file: File | undefined) {
    if (file) onFile(file);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl border border-dashed px-4 py-8 text-center transition ${
        over ? "border-accent bg-accent/5" : "border-line bg-white"
      }`}
    >
      <p className="text-base font-semibold text-ink">{label}</p>
      <p className="mt-1 text-sm text-ink-soft">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        required={false}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Bezig…" : "Kies foto"}
      </button>
    </div>
  );
}

export function BlogCoverField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { upload, busy, progress, error } = useImageUpload("cover");

  async function onFile(file: File) {
    const url = await upload(file);
    if (url) onChange(url);
  }

  if (value) {
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-line bg-bg-deep">
          {/* Remote Storage covers — keep unoptimized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
        {busy ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Uploaden… {progress}%</p>
            <ProgressBar value={progress} />
          </div>
        ) : null}
        {error ? <p className="text-base text-red-700">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-line px-5 text-sm font-medium text-ink-soft">
            Vervangen
            <input
              type="file"
              accept="image/*"
              required={false}
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFile(file);
                event.target.value = "";
              }}
            />
          </label>
          <AdminGhostButton disabled={busy} onClick={() => onChange("")}>
            Verwijderen
          </AdminGhostButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DropZone
        label="Sleep een foto hierheen"
        hint="Of kies uit je album — iPhone-rol werkt ook."
        busy={busy}
        onFile={(file) => void onFile(file)}
      />
      {busy ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Uploaden… {progress}%</p>
          <ProgressBar value={progress} />
        </div>
      ) : null}
      {error ? <p className="text-base text-red-700">{error}</p> : null}
    </div>
  );
}
