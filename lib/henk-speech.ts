/** Dutch male speech — neural Maarten voice via API. */

let speakGeneration = 0;
let sharedAudio: HTMLAudioElement | null = null;
/** Separate element so unlock never tears down an in-flight Maarten play. */
let unlockAudioEl: HTMLAudioElement | null = null;
let currentAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let objectUrl: string | null = null;
/** Near-silent oscillator keeps the iOS audio session alive during TTS fetch. */
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

/** Prefetched Maarten blobs (e.g. intro while mic permission dialog is open). */
const prefetchCache = new Map<string, Promise<Blob | null>>();

export function clearSpeechPrefetchCache() {
  prefetchCache.clear();
}

/** Tiny silent WAV — unlocks HTMLAudioElement on a user gesture (iOS). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

type SpeakOpts = { onEnd?: () => void; onError?: () => void };

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute("playsinline", "true");
    sharedAudio.setAttribute("webkit-playsinline", "true");
    (sharedAudio as HTMLAudioElement & { playsInline?: boolean }).playsInline =
      true;
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function getUnlockAudio(): HTMLAudioElement {
  if (!unlockAudioEl) {
    unlockAudioEl = new Audio();
    unlockAudioEl.setAttribute("playsinline", "true");
    unlockAudioEl.setAttribute("webkit-playsinline", "true");
    (unlockAudioEl as HTMLAudioElement & { playsInline?: boolean }).playsInline =
      true;
  }
  return unlockAudioEl;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function stopBufferSource() {
  if (!currentSource) return;
  try {
    currentSource.onended = null;
    currentSource.stop();
  } catch {
    /* already stopped */
  }
  try {
    currentSource.disconnect();
  } catch {
    /* ignore */
  }
  currentSource = null;
}

function stopKeepAlive() {
  if (keepAliveOsc) {
    try {
      keepAliveOsc.stop();
    } catch {
      /* ignore */
    }
    try {
      keepAliveOsc.disconnect();
    } catch {
      /* ignore */
    }
    keepAliveOsc = null;
  }
  if (keepAliveGain) {
    try {
      keepAliveGain.disconnect();
    } catch {
      /* ignore */
    }
    keepAliveGain = null;
  }
}

/**
 * Keep the iOS audio session in "playing" mode while we wait for Maarten MP3.
 * Without this, getUserMedia + a 1–3s fetch leaves play() blocked/silent.
 */
export function holdSpeechAudioSession() {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  stopKeepAlive();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.00008;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    keepAliveOsc = osc;
    keepAliveGain = gain;
  } catch {
    /* ignore */
  }
}

export function releaseSpeechAudioSession() {
  stopKeepAlive();
}

export function stopSpeaking() {
  speakGeneration += 1;
  stopBufferSource();
  stopKeepAlive();
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    try {
      currentAudio.load();
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
  revokeObjectUrl();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function canSpeak(): boolean {
  return typeof window !== "undefined";
}

/**
 * Call from a user gesture (Gespreksmodus toggle / mic tap) so later TTS
 * still works on iOS after mic + network round-trips.
 */
export async function unlockSpeechAudio(): Promise<void> {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();
  const resumeCtx =
    ctx && ctx.state === "suspended" ? ctx.resume() : Promise.resolve();

  const audio = getUnlockAudio();
  try {
    audio.muted = true;
    audio.src = SILENT_WAV;
  } catch {
    /* ignore */
  }
  const playEl = audio.play().catch(() => undefined);

  await Promise.race([
    Promise.all([resumeCtx, playEl]),
    new Promise<void>((resolve) => window.setTimeout(resolve, 350)),
  ]);

  try {
    audio.pause();
  } catch {
    /* ignore */
  }
  try {
    audio.muted = false;
    audio.removeAttribute("src");
  } catch {
    /* ignore */
  }

  holdSpeechAudioSession();
  warmSpeakEndpoint();
}

/** Re-wake the unlocked AudioContext after getUserMedia (iOS often suspends it). */
export async function resumeSpeechAudio(): Promise<void> {
  const ctx = audioCtx;
  if (ctx && ctx.state === "suspended") {
    try {
      await Promise.race([
        ctx.resume(),
        new Promise<void>((resolve) => window.setTimeout(resolve, 350)),
      ]);
    } catch {
      /* ignore */
    }
  }
}

/** Fire-and-forget warm-up of the Maarten speak route (cold start). */
export function warmSpeakEndpoint() {
  if (typeof window === "undefined") return;
  void fetch("/api/ask-henk/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hoi." }),
  })
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);
}

/**
 * Split into speakable chunks (used for prefetch while Groq streams).
 * Playback itself uses one Maarten request for reliability on mobile.
 */
export function splitSpeakChunks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const raw =
    trimmed.match(/[^.!?…]+(?:[.!?…]+["'"»”]?)?(?:\s+|$)/gu) ?? [trimmed];

  const merged: string[] = [];
  for (const part of raw) {
    const s = part.trim();
    if (!s) continue;
    const prev = merged[merged.length - 1];
    if (prev && (s.length < 24 || prev.length < 36)) {
      merged[merged.length - 1] = `${prev} ${s}`;
    } else {
      merged.push(s);
    }
  }

  return merged.length ? merged : [trimmed];
}

/** First complete sentence suitable for early TTS while Groq is still streaming. */
export function firstSpeakableSentence(text: string): string | null {
  const trimmed = text.trim();
  if (!/[.!?…]/.test(trimmed)) return null;

  const first = splitSpeakChunks(trimmed)[0]?.trim();
  if (!first || first.length < 12) return null;
  if (!/[.!?…]["'"»”]?\s*$/u.test(first)) return null;
  return first;
}

async function requestSpeakBlob(text: string): Promise<Blob | null> {
  try {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 15000);
    const res = await fetch("/api/ask-henk/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return blob;
  } catch {
    return null;
  }
}

async function fetchSpeakBlob(
  text: string,
  gen: number,
): Promise<Blob | null> {
  const key = text.trim();
  const cached = prefetchCache.get(key);
  if (cached) {
    prefetchCache.delete(key);
    const blob = await cached;
    if (gen !== speakGeneration) return null;
    return blob;
  }

  const blob = await requestSpeakBlob(key);
  if (gen !== speakGeneration) return null;
  return blob;
}

/**
 * Start synthesizing early (e.g. intro during mic permission, or while Groq streams).
 */
export function prefetchDutchSpeech(text: string) {
  const key = text.trim();
  if (!key || prefetchCache.has(key)) return;
  if (prefetchCache.size > 6) {
    const first = prefetchCache.keys().next().value;
    if (first) prefetchCache.delete(first);
  }
  prefetchCache.set(key, requestSpeakBlob(key));
}

async function playViaHtmlAudio(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  await resumeSpeechAudio();
  if (gen !== speakGeneration) return "abort";

  revokeObjectUrl();
  const url = URL.createObjectURL(blob);
  objectUrl = url;

  const audio = getSharedAudio();
  currentAudio = audio;
  audio.muted = false;
  audio.volume = 1;

  return new Promise((resolve) => {
    if (gen !== speakGeneration) {
      revokeObjectUrl();
      resolve("abort");
      return;
    }

    let settled = false;
    const finish = (result: "ok" | "abort" | "fail") => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadeddata = null;
      revokeObjectUrl();
      if (currentAudio === audio) currentAudio = null;
      resolve(result);
    };

    audio.onended = () => {
      if (gen !== speakGeneration) {
        finish("abort");
        return;
      }
      finish("ok");
    };
    audio.onerror = () => finish("fail");
    audio.src = url;
    audio.load();
    void audio.play().then(
      () => {
        /* playing */
      },
      () => finish("fail"),
    );
  });
}

async function playViaWebAudio(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  const ctx = getAudioContext();
  if (!ctx) return "fail";

  await resumeSpeechAudio();
  if (gen !== speakGeneration) return "abort";

  const raw = await blob.arrayBuffer();
  if (gen !== speakGeneration) return "abort";

  const copy = raw.slice(0);
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(copy);
  } catch {
    return "fail";
  }
  if (gen !== speakGeneration) return "abort";
  if (buffer.duration < 0.12) return "fail";

  stopBufferSource();

  return new Promise((resolve) => {
    if (gen !== speakGeneration) {
      resolve("abort");
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    currentSource = source;
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      if (gen !== speakGeneration) {
        resolve("abort");
        return;
      }
      resolve("ok");
    };
    try {
      source.start(0);
    } catch {
      currentSource = null;
      resolve("fail");
    }
  });
}

async function playBlob(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  if (gen !== speakGeneration) return "abort";

  // HTMLAudioElement first — more reliable on iOS after getUserMedia
  const viaEl = await playViaHtmlAudio(blob, gen);
  if (viaEl === "ok" || viaEl === "abort") return viaEl;

  if (gen !== speakGeneration) return "abort";
  return playViaWebAudio(blob, gen);
}

/**
 * Speak Dutch with Maarten as a single request (no sentence splitting).
 * Sentence chunking was delaying/breaking mobile playback after mic permission.
 * Browser TTS fallback removed — it often "ended" silently on iOS and opened the mic.
 */
export function speakDutch(text: string, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  stopSpeaking();
  const gen = speakGeneration;
  const trimmed = text.trim();

  // Keep session hot while Edge synthesizes (critical after mic permission on iOS)
  holdSpeechAudioSession();

  void (async () => {
    try {
      const blob = await fetchSpeakBlob(trimmed, gen);
      if (gen !== speakGeneration) return;

      if (!blob) {
        stopKeepAlive();
        opts?.onError?.();
        return;
      }

      stopKeepAlive();
      await resumeSpeechAudio();
      if (gen !== speakGeneration) return;

      const result = await playBlob(blob, gen);
      if (result === "abort") return;
      if (result === "fail") {
        opts?.onError?.();
        return;
      }
      opts?.onEnd?.();
    } catch {
      stopKeepAlive();
      if (gen === speakGeneration) opts?.onError?.();
    }
  })();

  return true;
}

export function warmSpeechVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  void window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    void window.speechSynthesis.getVoices();
  });
}
