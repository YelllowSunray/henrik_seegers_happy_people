"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import {
  canSpeak,
  speakDutch,
  stopSpeaking,
  warmSpeechVoices,
} from "@/lib/henk-speech";
import {
  pauseMusicForChat,
  resumeMusicAfterChat,
} from "@/components/synced-lyric-player";

type Turn = { role: "user" | "assistant"; content: string };
type ConvoPhase =
  | "idle"
  | "thinking"
  | "speaking"
  | "listening"
  | "transcribing";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-ink-soft" aria-hidden>
      <span className="henk-typing-dot" />
      <span className="henk-typing-dot" />
      <span className="henk-typing-dot" />
    </span>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M6 11a6 6 0 0 0 12 0M12 17v3M9 20h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 10v4h3l5 4V6L7 10H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a6 6 0 0 1 0 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

function watchSilence(
  stream: MediaStream,
  onSilence: () => void,
): () => void {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return () => {};

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);

  let heardSpeech = false;
  let lastLoud = Date.now();
  const startedAt = Date.now();

  const iv = window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i]! - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    if (rms > 0.045) {
      heardSpeech = true;
      lastLoud = Date.now();
    } else if (heardSpeech && Date.now() - lastLoud > 1500) {
      onSilence();
    } else if (!heardSpeech && Date.now() - startedAt > 12000) {
      // No speech for a while — stop so we don't hang forever
      onSilence();
    } else if (Date.now() - startedAt > 45000) {
      onSilence();
    }
  }, 120);

  return () => {
    window.clearInterval(iv);
    try {
      source.disconnect();
    } catch {
      /* ignore */
    }
    void ctx.close();
  };
}

export function AskHenkChat({
  compact = false,
  fill = false,
  keyboardOpen = false,
}: {
  compact?: boolean;
  fill?: boolean;
  keyboardOpen?: boolean;
}) {
  const t = useTranslations("askHenk");
  const locale = useLocale();
  const { user } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [henkTyping, setHenkTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState(false);
  const [phase, setPhase] = useState<ConvoPhase>("idle");
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceStopRef = useRef<(() => void) | null>(null);
  const conversationModeRef = useRef(conversationMode);
  const busyRef = useRef(busy);
  const recordingRef = useRef(recording);
  const startRecordingRef = useRef<() => Promise<void>>(async () => {});
  const lastSpokenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    setMicSupported(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined",
    );
    setSpeechSupported(canSpeak());
    warmSpeechVoices();
    pauseMusicForChat();
    return () => {
      stopSpeaking();
      silenceStopRef.current?.();
      mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      resumeMusicAfterChat();
    };
  }, []);

  function scrollMessagesToEnd(behavior: ScrollBehavior = "auto") {
    const list = listRef.current;
    if (!list) return;
    if (behavior === "smooth") {
      list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }

  useEffect(() => {
    if (!stickToBottom.current) return;
    scrollMessagesToEnd(busy ? "auto" : "smooth");
  }, [turns, henkTyping, busy, keyboardOpen, phase]);

  useEffect(() => {
    if (!fill) return;
    const vv = window.visualViewport;
    const onResize = () => {
      if (stickToBottom.current) scrollMessagesToEnd("auto");
    };
    vv?.addEventListener("resize", onResize);
    return () => vv?.removeEventListener("resize", onResize);
  }, [fill]);

  function readAloud(
    content: string,
    index: number,
    opts?: { afterSpeak?: () => void; key?: string },
  ) {
    if (!canSpeak() || !content.trim()) {
      opts?.afterSpeak?.();
      return;
    }

    const key = opts?.key ?? `${index}:${content.slice(0, 80)}`;
    if (lastSpokenKeyRef.current === key) {
      // Already speaking / spoke this exact reply — don't double-read
      return;
    }
    lastSpokenKeyRef.current = key;

    stopSpeaking();
    setSpeakingIndex(index);
    setPhase("speaking");

    const spoken = speakDutch(content, {
      onEnd: () => {
        setSpeakingIndex(null);
        lastSpokenKeyRef.current = null;
        opts?.afterSpeak?.();
      },
      onError: () => {
        setSpeakingIndex(null);
        lastSpokenKeyRef.current = null;
        opts?.afterSpeak?.();
      },
    });

    if (!spoken) {
      lastSpokenKeyRef.current = null;
      setSpeakingIndex(null);
      opts?.afterSpeak?.();
    }
  }

  async function stopMicTracks() {
    silenceStopRef.current?.();
    silenceStopRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((tr) => tr.stop());
    mediaStreamRef.current = null;
  }

  async function startRecording() {
    if (
      busyRef.current ||
      recordingRef.current ||
      !micSupported ||
      mediaRecorderRef.current
    ) {
      return;
    }
    setError(null);
    stopSpeaking();
    setSpeakingIndex(null);
    lastSpokenKeyRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        void finishRecording(recorder.mimeType || mime || "audio/webm");
      };

      recorder.start(250);
      setRecording(true);
      setPhase("listening");

      if (conversationModeRef.current) {
        silenceStopRef.current = watchSilence(stream, () => {
          if (mediaRecorderRef.current?.state === "recording") {
            stopRecording();
          }
        });
      }
    } catch {
      await stopMicTracks();
      setPhase(conversationModeRef.current ? "idle" : "idle");
      setError(t("micDenied"));
    }
  }

  startRecordingRef.current = startRecording;

  function stopRecording() {
    silenceStopRef.current?.();
    silenceStopRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      void stopMicTracks();
      return;
    }
    recorder.stop();
    setRecording(false);
  }

  async function finishRecording(mimeType: string) {
    const blobs = chunksRef.current;
    chunksRef.current = [];
    await stopMicTracks();
    mediaRecorderRef.current = null;

    if (!blobs.length) {
      setError(t("micEmpty"));
      setPhase(conversationModeRef.current ? "idle" : "idle");
      return;
    }

    const ext = mimeType.includes("mp4")
      ? "mp4"
      : mimeType.includes("ogg")
        ? "ogg"
        : "webm";
    const file = new File(blobs, `voice.${ext}`, { type: mimeType });

    setTranscribing(true);
    setPhase("transcribing");
    setError(null);
    try {
      const body = new FormData();
      body.append("audio", file);
      body.append("locale", locale);

      const res = await fetch("/api/ask-henk/transcribe", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => null)) as {
        text?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.text) {
        throw new Error(data?.error || t("micFailed"));
      }
      await sendMessage(data.text);
    } catch (err) {
      setError((err as Error).message || t("micFailed"));
      setPhase(conversationModeRef.current ? "idle" : "idle");
    } finally {
      setTranscribing(false);
    }
  }

  function afterHenkSpoke() {
    if (!conversationModeRef.current) {
      setPhase("idle");
      return;
    }
    // Open the mic for the next turn
    void startRecordingRef.current();
  }

  async function sendMessage(message: string) {
    if (!message.trim() || busyRef.current) return;

    stopSpeaking();
    setSpeakingIndex(null);
    lastSpokenKeyRef.current = null;
    setText("");
    setError(null);
    setBusy(true);
    setHenkTyping(true);
    setPhase("thinking");
    stickToBottom.current = true;

    const shouldSpeak = conversationModeRef.current;
    const history = turns.slice(-8);
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    requestAnimationFrame(() => scrollMessagesToEnd("auto"));

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    let finalAssistant = "";
    let assistantIndex = -1;

    try {
      await sleep(500 + Math.random() * 400, ac.signal);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }

      const res = await fetch("/api/ask-henk", {
        method: "POST",
        headers,
        body: JSON.stringify({ message, locale, history }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || t("sendFailed"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let shown = 0;
      let assistantStarted = false;
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const ensureAssistantTurn = () => {
        if (assistantStarted) return;
        assistantStarted = true;
        setTurns((prev) => {
          assistantIndex = prev.length;
          return [...prev, { role: "assistant", content: "" }];
        });
      };

      const revealUpTo = (target: number) => {
        ensureAssistantTurn();
        shown = target;
        const snapshot = full.slice(0, shown);
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: snapshot };
          return next;
        });
      };

      const drainVisible = async (forceAll = false) => {
        while (shown < full.length) {
          if (ac.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (reduceMotion || forceAll) {
            revealUpTo(full.length);
            break;
          }
          const nextChar = full[shown] ?? "";
          const chunkSize =
            nextChar === "\n"
              ? 1
              : /[.!?…]/.test(nextChar)
                ? 1
                : /[,;:]/.test(nextChar)
                  ? 1
                  : 2 + Math.floor(Math.random() * 3);
          revealUpTo(Math.min(full.length, shown + chunkSize));
          const delay =
            nextChar === "\n"
              ? 160 + Math.random() * 100
              : /[.!?…]/.test(nextChar)
                ? 120 + Math.random() * 120
                : /[,;:]/.test(nextChar)
                  ? 60 + Math.random() * 50
                  : 16 + Math.random() * 22;
          await sleep(delay, ac.signal);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (!assistantStarted && full.trim()) {
          await sleep(280 + Math.random() * 180, ac.signal);
          setHenkTyping(false);
        }
        await drainVisible(false);
      }
      full += decoder.decode();
      await drainVisible(true);
      setHenkTyping(false);
      finalAssistant = full.trim();

      if (!finalAssistant) {
        throw new Error(t("sendFailed"));
      }

      setBusy(false);

      if (shouldSpeak && finalAssistant) {
        // Prefer index captured when the assistant bubble was created
        setTurns((prev) => {
          const idx =
            assistantIndex >= 0 ? assistantIndex : Math.max(0, prev.length - 1);
          // Defer speak so React can commit the final bubble once
          window.setTimeout(() => {
            readAloud(finalAssistant, idx, {
              key: `auto:${finalAssistant.length}:${finalAssistant.slice(0, 48)}`,
              afterSpeak: afterHenkSpoke,
            });
          }, 80);
          return prev;
        });
      } else {
        setPhase("idle");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message || t("sendFailed"));
      setTurns((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && !last.content.trim()) next.pop();
        if (next[next.length - 1]?.role === "user") next.pop();
        return next;
      });
      setText(message);
      setHenkTyping(false);
      setPhase("idle");
      setBusy(false);
    } finally {
      setBusy(false);
      setHenkTyping(false);
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (recording) stopRecording();
    await sendMessage(text);
  }

  function toggleMic() {
    if (recording) stopRecording();
    else void startRecording();
  }

  async function toggleConversationMode() {
    warmSpeechVoices();
    const next = !conversationMode;
    setConversationMode(next);
    conversationModeRef.current = next;

    if (!next) {
      stopSpeaking();
      setSpeakingIndex(null);
      lastSpokenKeyRef.current = null;
      if (recording) stopRecording();
      setPhase("idle");
      return;
    }

    // Unlock audio + optionally mic on user gesture
    setPhase("idle");
    if (micSupported) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((tr) => tr.stop());
      } catch {
        /* permission can be granted on first listen */
      }
    }
  }

  const last = turns[turns.length - 1];
  const showCaret =
    busy &&
    !henkTyping &&
    last?.role === "assistant" &&
    last.content.length > 0;

  function onListScroll() {
    const list = listRef.current;
    if (!list) return;
    const distance = list.scrollHeight - list.scrollTop - list.clientHeight;
    stickToBottom.current = distance < 80;
  }

  const inputBusy = busy || recording || transcribing;
  const statusLabel =
    phase === "speaking"
      ? t("statusSpeaking")
      : phase === "listening"
        ? t("statusListening")
        : phase === "transcribing"
          ? t("statusTranscribing")
          : phase === "thinking"
            ? t("statusThinking")
            : null;

  return (
    <div
      className={`flex min-h-0 flex-col bg-bg ${
        fill
          ? "h-full"
          : compact
            ? ""
            : "overflow-hidden rounded-2xl border border-line"
      }`}
    >
      {(speechSupported || micSupported) && (
        <div
          className={`shrink-0 border-b border-line px-3 py-2.5 ${
            conversationMode ? "bg-ink text-white" : "bg-bg"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void toggleConversationMode()}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                conversationMode
                  ? "bg-white/15 text-white"
                  : "bg-bg-deep text-ink-soft hover:text-ink"
              }`}
              aria-pressed={conversationMode}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  conversationMode
                    ? phase === "listening"
                      ? "bg-red-400 animate-pulse"
                      : phase === "speaking"
                        ? "bg-gold animate-pulse"
                        : "bg-accent"
                    : "bg-ink-soft/40"
                }`}
              />
              {conversationMode ? t("convoOn") : t("convoOff")}
            </button>

            {speakingIndex != null && (
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setSpeakingIndex(null);
                  lastSpokenKeyRef.current = null;
                  if (conversationMode) afterHenkSpoke();
                  else setPhase("idle");
                }}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${
                  conversationMode
                    ? "bg-white/10 text-white/90"
                    : "bg-bg-deep text-ink-soft"
                }`}
              >
                <StopIcon className="h-3.5 w-3.5" />
                {t("stopSpeak")}
              </button>
            )}
          </div>

          {conversationMode && statusLabel && (
            <p className="mt-1.5 text-xs font-semibold tracking-wide text-gold uppercase">
              {statusLabel}
            </p>
          )}
        </div>
      )}

      <div
        ref={listRef}
        data-henk-chat-scroll
        onScroll={onListScroll}
        className={`flex flex-col gap-3 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] ${
          fill
            ? "min-h-0 flex-1"
            : compact
              ? "h-[min(24rem,55vh)]"
              : "max-h-[min(28rem,60vh)] min-h-[16rem]"
        }`}
      >
        {turns.length === 0 && !henkTyping && (
          <div className="my-auto space-y-3 text-center">
            <p className="text-ink-soft">{t("empty")}</p>
            {conversationMode ? (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={!micSupported || recording || busy}
                className="mx-auto flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
              >
                <MicIcon className="h-5 w-5" />
                {t("convoStartTalk")}
              </button>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {[t("prompt1"), t("prompt2"), t("prompt3")].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setText(prompt);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border border-line bg-bg-deep px-3 py-1.5 text-left text-sm text-ink-soft transition hover:border-accent hover:text-ink"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {turns.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-accent text-white"
                  : "bg-bg-deep text-ink"
              }`}
            >
              {turn.role === "assistant" && (
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
                    {t("fromHenk")}
                  </p>
                  {speechSupported && turn.content.trim() && !showCaret && (
                    <button
                      type="button"
                      onClick={() => {
                        if (speakingIndex === i) {
                          stopSpeaking();
                          setSpeakingIndex(null);
                          lastSpokenKeyRef.current = null;
                          setPhase("idle");
                        } else {
                          readAloud(turn.content, i, {
                            key: `manual:${i}:${turn.content.slice(0, 40)}`,
                          });
                        }
                      }}
                      className="rounded-full p-1 text-accent/80 transition hover:bg-accent/10 hover:text-accent"
                      aria-label={
                        speakingIndex === i ? t("stopSpeak") : t("speak")
                      }
                    >
                      {speakingIndex === i ? (
                        <StopIcon className="h-3.5 w-3.5" />
                      ) : (
                        <SpeakerIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              )}
              {turn.content}
              {showCaret && i === turns.length - 1 ? (
                <span className="henk-caret" aria-hidden />
              ) : null}
            </div>
          </div>
        ))}

        {henkTyping && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl bg-bg-deep px-3.5 py-2.5 text-sm text-ink">
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.14em] text-accent uppercase">
                {t("fromHenk")}
              </p>
              <div className="flex items-center gap-2">
                <TypingDots />
                <span className="text-xs text-ink-soft">{t("typing")}</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-px w-full shrink-0" />
      </div>

      {error && (
        <p className="shrink-0 border-t border-line px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={onSend}
        className={`flex shrink-0 items-center gap-2 border-t border-line bg-bg p-3 ${
          fill && !keyboardOpen
            ? "pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            : ""
        }`}
      >
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy || transcribing || phase === "speaking"}
            aria-pressed={recording}
            aria-label={recording ? t("micStop") : t("micStart")}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
              recording
                ? "bg-red-600 text-white animate-pulse"
                : conversationMode
                  ? "bg-ink text-white hover:bg-accent"
                  : "border border-line bg-bg-deep text-ink hover:border-accent hover:text-accent"
            }`}
          >
            {recording ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicIcon className="h-5 w-5" />
            )}
          </button>
        )}
        <input
          ref={inputRef}
          value={
            recording
              ? t("micListening")
              : transcribing
                ? t("micTranscribing")
                : phase === "speaking"
                  ? t("statusSpeaking")
                  : text
          }
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            stickToBottom.current = true;
            window.setTimeout(() => scrollMessagesToEnd("auto"), 50);
            window.setTimeout(() => scrollMessagesToEnd("auto"), 300);
          }}
          placeholder={
            conversationMode ? t("convoPlaceholder") : t("placeholder")
          }
          disabled={inputBusy || phase === "speaking"}
          readOnly={recording || transcribing || phase === "speaking"}
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-line bg-bg-deep px-4 py-2.5 text-base outline-none focus:border-accent disabled:opacity-70 md:text-sm"
        />
        <button
          type="submit"
          disabled={
            inputBusy ||
            !text.trim() ||
            recording ||
            transcribing ||
            phase === "speaking"
          }
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? t("thinking") : t("send")}
        </button>
      </form>
    </div>
  );
}
