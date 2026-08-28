/** Dutch male speech — neural Maarten voice via API, browser TTS fallback. */

let speakGeneration = 0;
let sharedAudio: HTMLAudioElement | null = null;
let currentAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let objectUrl: string | null = null;

/** Prefetched Maarten blobs (e.g. first sentence while Groq still streams). */
const prefetchCache = new Map<string, Promise<Blob | null>>();

export function clearSpeechPrefetchCache() {
  prefetchCache.clear();
}

/** Tiny silent WAV — unlocks HTMLAudioElement on a user gesture (iOS). */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const FEMALE_HINT =
  /female|vrouw|\bzira\b|\bsusan\b|\bsamantha\b|\bkaren\b|\bmoira\b|\btessa\b|\bfiona\b|\bveena\b|\bellen\b/i;
const MALE_HINT =
  /\bmale\b|\bman\b|\bxander\b|\bruben\b|\bfrank\b|\bdaan\b|\blucas\b|\bthomas\b|\bmark\b|\bdavid\b|\bdaniel\b|microsoft.*(?:bram|coen)|google.*male/i;

type SpeakOpts = { onEnd?: () => void; onError?: () => void };

function scoreDutchMaleVoice(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase();
  if (!lang.startsWith("nl")) return -100;
  let score = 10;
  if (lang === "nl-nl") score += 8;
  if (MALE_HINT.test(v.name)) score += 40;
  if (FEMALE_HINT.test(v.name)) score -= 50;
  if (/^xander$/i.test(v.name.trim())) score += 30;
  if (/premium|enhanced|neural|natural/i.test(v.name)) score += 5;
  if (/compact|eloquence/i.test(v.name)) score -= 15;
  return score;
}

function pickDutchMaleVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const ranked = voices
    .map((v) => ({ v, score: scoreDutchMaleVoice(v) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.v ?? null;
}

function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.setAttribute("playsinline", "true");
    sharedAudio.setAttribute("webkit-playsinline", "true");
    (sharedAudio as HTMLAudioElement & { playsInline?: boolean }).playsInline =
      true;
  }
  return sharedAudio;
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

export function stopSpeaking() {
  speakGeneration += 1;
  stopBufferSource();
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
 * Never hangs — iOS can leave audio.play() pending forever on data-URIs.
 */
export async function unlockSpeechAudio(): Promise<void> {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();
  const resumeCtx =
    ctx && ctx.state === "suspended" ? ctx.resume() : Promise.resolve();

  const audio = getSharedAudio();
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
 * Split into speakable chunks so the first (short) sentence can synthesize
 * and play while later sentences still load — same Maarten voice, less wait.
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

  const out: string[] = [];
  for (const chunk of merged.length ? merged : [trimmed]) {
    if (chunk.length < 160) {
      out.push(chunk);
      continue;
    }
    const bits = chunk.split(/(?<=[;:—–])\s+/u);
    let buf = "";
    for (const bit of bits) {
      const next = buf ? `${buf} ${bit}` : bit;
      if (next.length > 120 && buf) {
        out.push(buf);
        buf = bit;
      } else {
        buf = next;
      }
    }
    if (buf) out.push(buf);
  }

  return out.length ? out : [trimmed];
}

/** First complete sentence suitable for early TTS while Groq is still streaming. */
export function firstSpeakableSentence(text: string): string | null {
  const trimmed = text.trim();
  // Need a real sentence end — don't prefetch a still-growing clause
  if (!/[.!?…]/.test(trimmed)) return null;

  const first = splitSpeakChunks(trimmed)[0]?.trim();
  if (!first || first.length < 12) return null;
  if (!/[.!?…]["'"»”]?\s*$/u.test(first)) return null;
  return first;
}

function speakBrowserFallback(text: string, gen: number, opts?: SpeakOpts) {
  if (!window.speechSynthesis) {
    opts?.onError?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  let started = false;
  const start = () => {
    if (started || gen !== speakGeneration) return;
    started = true;

    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = "nl-NL";
    utter.rate = 1;
    utter.pitch = 1;

    const voice = pickDutchMaleVoice(synth.getVoices());
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang || "nl-NL";
    }

    utter.onend = () => {
      if (gen !== speakGeneration) return;
      opts?.onEnd?.();
    };
    utter.onerror = () => {
      if (gen !== speakGeneration) return;
      opts?.onError?.();
    };

    synth.speak(utter);
  };

  if (synth.getVoices().length === 0) {
    synth.addEventListener("voiceschanged", start, { once: true });
    window.setTimeout(start, 250);
  } else {
    window.setTimeout(start, 40);
  }
}

async function requestSpeakBlob(text: string): Promise<Blob | null> {
  try {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 12000);
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
 * Start synthesizing a chunk early (e.g. first sentence during Groq stream).
 * speakDutch will reuse this blob when it reaches the same text.
 */
export function prefetchDutchSpeech(text: string) {
  const key = text.trim();
  if (!key || prefetchCache.has(key)) return;
  // Cap cache size
  if (prefetchCache.size > 6) {
    const first = prefetchCache.keys().next().value;
    if (first) prefetchCache.delete(first);
  }
  prefetchCache.set(key, requestSpeakBlob(key));
}

async function playBlob(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  if (gen !== speakGeneration) return "abort";

  const viaCtx = await playViaWebAudio(blob, gen);
  if (viaCtx === "ok" || viaCtx === "abort") return viaCtx;

  if (gen !== speakGeneration) return "abort";
  return playViaHtmlAudio(blob, gen);
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

  return new Promise((resolve) => {
    if (gen !== speakGeneration) {
      revokeObjectUrl();
      resolve("abort");
      return;
    }

    const finish = (result: "ok" | "abort" | "fail") => {
      audio.onended = null;
      audio.onerror = null;
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
    void audio.play().then(
      () => {
        /* playing */
      },
      () => finish("fail"),
    );
  });
}

/**
 * Speak Dutch with Maarten. Splits into sentences and synthesizes them in
 * parallel — play starts as soon as the first chunk is ready (same voice).
 */
export function speakDutch(text: string, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  stopSpeaking();
  const gen = speakGeneration;
  const chunks = splitSpeakChunks(text.trim());

  // Parallel Edge TTS for every sentence (first may already be prefetched)
  const fetches = chunks.map((c) => fetchSpeakBlob(c, gen));

  void (async () => {
    for (let i = 0; i < chunks.length; i++) {
      if (gen !== speakGeneration) return;

      const blob = await fetches[i];
      if (gen !== speakGeneration) return;

      if (!blob) {
        speakBrowserFallback(chunks.slice(i).join(" "), gen, opts);
        return;
      }

      const result = await playBlob(blob, gen);
      if (result === "abort") return;
      if (result === "fail") {
        speakBrowserFallback(chunks.slice(i).join(" "), gen, opts);
        return;
      }
    }

    if (gen !== speakGeneration) return;
    opts?.onEnd?.();
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
