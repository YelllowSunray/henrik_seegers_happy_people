"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_RECORD_MS,
  MAX_VLOG_BYTES,
  canUseMediaRecorder,
  pickRecorderFormat,
} from "@/lib/media-record";

type Phase = "choose" | "live" | "recording";

export type VlogMediaSource =
  | { type: "file"; blob: Blob }
  | { type: "youtube"; url: string; id: string };

function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function rejectIfTooBig(file: Blob): string | null {
  if (file.size > MAX_VLOG_BYTES) {
    return "Deze video is groter dan 80 MB. Kies een korter bestand.";
  }
  if (file.size === 0) {
    return "Dit bestand is leeg. Kies een andere video.";
  }
  return null;
}

export function cameraErrorMessage(err: unknown): string {
  if (!canUseMediaRecorder()) {
    return window.isSecureContext
      ? "Opnemen werkt niet in deze browser. Gebruik Safari op iPhone of Chrome op de computer."
      : "Opnemen kan alleen via een beveiligde verbinding (https).";
  }
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Geen toegang tot camera of microfoon. Sta toegang toe en probeer opnieuw.";
  }
  if (name === "NotFoundError") return "Geen camera of microfoon gevonden.";
  return err instanceof Error ? err.message : "Camera starten lukte niet.";
}

/** Must be called from a tap, so the phone shows the camera permission. */
export async function openVlogCamera(): Promise<MediaStream> {
  if (!canUseMediaRecorder()) {
    throw new Error(cameraErrorMessage(new Error("unsupported")));
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err) {
    throw new Error(cameraErrorMessage(err));
  }
}

/** Record a vlog in the browser. Pass a stream from the tap that opened the form. */
export function VlogMediaPick({
  onReady,
  onCancel,
  initialStream = null,
}: {
  onReady: (source: VlogMediaSource) => void;
  onCancel?: () => void;
  initialStream?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(initialStream);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [phase, setPhase] = useState<Phase>(initialStream ? "live" : "choose");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

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

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const attachStream = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    const stream = streamRef.current;
    if (!node || !stream) return;
    node.srcObject = stream;
    node.muted = true;
    node.defaultMuted = true;
    node.setAttribute("playsinline", "true");
    node.setAttribute("webkit-playsinline", "true");
    node.playsInline = true;
    void node.play().catch(() => {
      /* muted inline playback can start on the next tap */
    });
  }, []);

  useEffect(() => {
    if (phase !== "live" && phase !== "recording") return;
    controlsRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [phase]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await openVlogCamera();
      streamRef.current = stream;
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera starten lukte niet.");
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
        stopTracks();
        const type = recorder.mimeType || format.mimeType || "video/mp4";
        const recorded = new Blob(chunksRef.current, { type });
        const tooBig = rejectIfTooBig(recorded);
        if (tooBig) {
          setError(tooBig);
          setPhase("choose");
          return;
        }
        onReady({ type: "file", blob: recorded });
      };
      recorder.start(250);
      setElapsed(0);
      setPhase("recording");
      const started = Date.now();
      timerRef.current = setInterval(() => {
        const next = Date.now() - started;
        setElapsed(next);
        if (next >= MAX_RECORD_MS) stopRecording();
      }, 250);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Opnemen starten lukte niet.",
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    clearTimer();
  }

  function cancelRecord() {
    stopRecording();
    stopTracks();
    setError(null);
    if (onCancel) {
      onCancel();
      return;
    }
    setPhase("choose");
  }

  return (
    <div>
      {phase === "choose" ? (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="flex min-h-28 w-full flex-col items-start justify-center rounded-2xl bg-ink px-5 py-5 text-left text-white shadow-sm transition hover:bg-ink/90"
        >
          <span className="font-display text-2xl leading-tight">
            Video opnemen
          </span>
          <span className="mt-2 text-sm leading-snug text-white/85">
            Neem nu op met camera en microfoon, hier in de browser.
          </span>
        </button>
      ) : null}

      {phase === "live" || phase === "recording" ? (
        <div>
          <div className="overflow-hidden rounded-2xl bg-ink">
            <video
              ref={attachStream}
              className="mx-auto aspect-[9/16] max-h-[calc(100dvh-18rem)] w-full bg-black object-cover"
              playsInline
              muted
              autoPlay
            />
          </div>
          {phase === "recording" ? (
            <p className="mt-3 text-sm font-semibold text-red-700">
              ● {formatTime(elapsed)} / {formatTime(MAX_RECORD_MS)}
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Controleer je beeld en tik op start.
            </p>
          )}
          <div
            ref={controlsRef}
            className="mt-3 flex scroll-mb-28 flex-wrap gap-2 pb-2"
          >
            {phase === "live" ? (
              <button
                type="button"
                onClick={startRecording}
                className="inline-flex min-h-12 items-center rounded-full bg-red-700 px-6 text-base font-semibold text-white"
              >
                Start opname
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-base font-semibold text-white"
              >
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={cancelRecord}
              className="inline-flex min-h-12 items-center rounded-full border border-line px-5 text-base font-medium text-ink-soft"
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : null}

      {phase === "choose" && onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ink-soft"
        >
          Annuleren
        </button>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
