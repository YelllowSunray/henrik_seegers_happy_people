"use client";

import { useEffect, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useAuth } from "@/components/auth-provider";
import { getClientStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  MAX_RECORD_MS,
  canUseMediaRecorder,
  pickRecorderFormat,
  recorderExtensionFromType,
} from "@/lib/media-record";

type Phase =
  | "idle"
  | "live"
  | "recording"
  | "preview"
  | "uploading"
  | "done";

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VlogRecorder({
  onUploaded,
  attachedUrl,
}: {
  onUploaded: (url: string) => void;
  attachedUrl?: string;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [formatNote, setFormatNote] = useState<string | null>(null);

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function revokeObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      revokeObjectUrl();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  async function attachPreview(stream: MediaStream) {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    el.playsInline = true;
    try {
      await el.play();
    } catch {
      /* iOS may require another tap; the live tile is still attached */
    }
  }

  async function startCamera() {
    setError(null);
    if (!canUseMediaRecorder()) {
      setError(
        window.isSecureContext
          ? "Opnemen werkt niet in deze browser. Gebruik Safari op iPhone of Chrome op de computer."
          : "Opnemen kan alleen via een beveiligde verbinding (https).",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setPhase("live");
      await attachPreview(stream);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Geen toegang tot camera of microfoon. Sta toegang toe in de browserinstellingen en probeer opnieuw.",
        );
      } else if (name === "NotFoundError") {
        setError("Geen camera of microfoon gevonden.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Camera starten lukte niet.",
        );
      }
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    setError(null);
    const format = pickRecorderFormat();
    chunksRef.current = [];
    try {
      const recorder = format.mimeType
        ? new MediaRecorder(stream, {
            mimeType: format.mimeType,
            videoBitsPerSecond: 2_000_000,
            audioBitsPerSecond: 128_000,
          })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onerror = () => {
        setError("Opnemen is gestopt door een fout.");
        setPhase("live");
        clearTimer();
      };
      recorder.onstop = () => {
        clearTimer();
        const type = recorder.mimeType || format.mimeType || "video/mp4";
        const recorded = new Blob(chunksRef.current, { type });
        setBlob(recorded);
        setFormatNote(
          type.includes("mp4")
            ? "Opname: MP4 (iPhone + computer)"
            : "Opname: WebM. Op iPhone het liefst opnieuw opnemen in Safari (MP4).",
        );
        revokeObjectUrl();
        const url = URL.createObjectURL(recorded);
        objectUrlRef.current = url;
        const el = videoRef.current;
        if (el) {
          el.srcObject = null;
          el.src = url;
          el.muted = false;
          el.controls = true;
          el.playsInline = true;
          el.setAttribute("playsinline", "true");
        }
        setPhase("preview");
      };
      recorder.start(250);
      setElapsed(0);
      setPhase("recording");
      const started = Date.now();
      timerRef.current = setInterval(() => {
        const next = Date.now() - started;
        setElapsed(next);
        if (next >= MAX_RECORD_MS) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Opnemen starten lukte niet.",
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    clearTimer();
  }

  async function rerecord() {
    setBlob(null);
    setFormatNote(null);
    setProgress(0);
    revokeObjectUrl();
    const el = videoRef.current;
    if (el) {
      el.removeAttribute("src");
      el.controls = false;
    }
    if (!streamRef.current) {
      setPhase("idle");
      await startCamera();
      return;
    }
    setPhase("live");
    await attachPreview(streamRef.current);
  }

  async function upload() {
    if (!blob) return;
    if (!user || !isFirebaseConfigured) {
      setError(
        "Log in met je Happy People-account (admin-e-mail) om de opname te uploaden.",
      );
      return;
    }
    setError(null);
    setPhase("uploading");
    setProgress(0);
    const type = blob.type || "video/mp4";
    const ext = recorderExtensionFromType(type);
    const path = `club-media/vlogs/${user.uid}/${Date.now()}.${ext}`;
    try {
      const storageRef = ref(getClientStorage(), path);
      const task = uploadBytesResumable(storageRef, blob, {
        contentType: type,
      });
      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => {
            if (snap.totalBytes > 0) {
              setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
            }
          },
          reject,
          () => resolve(),
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      stopTracks();
      setPhase("done");
      onUploaded(url);
    } catch (err) {
      setPhase("preview");
      setError(
        err instanceof Error
          ? err.message
          : "Uploaden naar Firebase Storage lukte niet.",
      );
    }
  }

  function discard() {
    stopRecording();
    stopTracks();
    revokeObjectUrl();
    setBlob(null);
    setPhase("idle");
    setError(null);
    setFormatNote(null);
    setProgress(0);
    const el = videoRef.current;
    if (el) {
      el.srcObject = null;
      el.removeAttribute("src");
      el.controls = false;
    }
  }

  const showVideo = phase !== "idle" && phase !== "done";

  return (
    <div className="mt-4 rounded-xl border border-dashed border-accent/45 bg-white/40 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Jezelf opnemen
        </p>
        {phase === "recording" ? (
          <p className="text-xs font-semibold text-red-700">
            ● {formatTime(elapsed)} / {formatTime(MAX_RECORD_MS)}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Camera en microfoon, rechtstreeks op deze pagina. Op iPhone: Safari.
      </p>

      {showVideo ? (
        <div className="mt-3 overflow-hidden rounded-lg bg-ink">
          <video
            ref={videoRef}
            className="aspect-[9/16] w-full bg-black object-cover sm:aspect-video"
            playsInline
            muted={phase !== "preview"}
            autoPlay={phase !== "preview"}
          />
        </div>
      ) : (
        <div ref={undefined} />
      )}

      {phase === "idle" || phase === "done" ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white sm:w-auto"
        >
          {phase === "done" || attachedUrl
            ? "Nieuwe opname maken"
            : "Camera openen"}
        </button>
      ) : null}

      {phase === "live" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex min-h-11 items-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white"
          >
            Start opname
          </button>
          <button
            type="button"
            onClick={discard}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium text-ink-soft"
          >
            Annuleren
          </button>
        </div>
      ) : null}

      {phase === "recording" ? (
        <button
          type="button"
          onClick={stopRecording}
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white"
        >
          Stop
        </button>
      ) : null}

      {phase === "preview" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void upload()}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white"
          >
            Uploaden en koppelen
          </button>
          <button
            type="button"
            onClick={() => void rerecord()}
            className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink"
          >
            Opnieuw opnemen
          </button>
        </div>
      ) : null}

      {phase === "uploading" ? (
        <p className="mt-3 text-sm font-medium text-ink">
          Uploaden… {progress}%
        </p>
      ) : null}

      {phase === "done" ? (
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Opname gekoppeld. Publiceer of sla op om hem op de site te zetten.
        </p>
      ) : null}

      {formatNote && phase === "preview" ? (
        <p className="mt-2 text-xs text-ink-soft">{formatNote}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
