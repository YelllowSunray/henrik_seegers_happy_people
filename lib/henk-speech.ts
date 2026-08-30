/** Dutch male speech — neural Maarten via API. iOS/desktop-safe single-element playback. */

let speakGeneration = 0;
let sharedAudio: HTMLAudioElement | null = null;
let currentAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let objectUrl: string | null = null;
let keepAliveOsc: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

const prefetchCache = new Map<string, Promise<Blob | null>>();

export function clearSpeechPrefetchCache() {
  prefetchCache.clear();
}

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

function stopKeepAliveOsc() {
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

export function holdSpeechAudioSession() {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  stopKeepAliveOsc();
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
  stopKeepAliveOsc();
}

/** Prime the shared element during a user gesture (never hangs). */
export async function startSilentKeepAlive(): Promise<void> {
  if (typeof window === "undefined") return;
  const audio = getSharedAudio();
  try {
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;
    audio.loop = true;
    audio.muted = false;
    audio.volume = 0.01;
    audio.src = SILENT_WAV;
    await Promise.race([
      audio.play().catch(() => undefined),
      new Promise<void>((r) => window.setTimeout(r, 400)),
    ]);
  } catch {
    /* ignore */
  }
}

export function pauseSilentKeepAlive() {
  const audio = sharedAudio;
  if (!audio) return;
  try {
    audio.pause();
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  speakGeneration += 1;
  stopBufferSource();
  revokeObjectUrl();

  const audio = sharedAudio;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.oncanplaythrough = null;
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
  }
  currentAudio = null;

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function canSpeak(): boolean {
  return typeof window !== "undefined";
}

/** Call from a click/tap (Gespreksmodus, Send, speaker, mic). */
export async function unlockSpeechAudio(): Promise<void> {
  if (typeof window === "undefined") return;

  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  await startSilentKeepAlive();
  holdSpeechAudioSession();
  warmSpeakEndpoint();
}

export async function resumeSpeechAudio(): Promise<void> {
  const ctx = audioCtx;
  if (ctx && ctx.state === "suspended") {
    try {
      await Promise.race([
        ctx.resume(),
        new Promise<void>((r) => window.setTimeout(r, 350)),
      ]);
    } catch {
      /* ignore */
    }
  }
  await startSilentKeepAlive();
}

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

export function prefetchDutchSpeech(text: string) {
  const key = text.trim();
  if (!key || prefetchCache.has(key)) return;
  if (prefetchCache.size > 6) {
    const first = prefetchCache.keys().next().value;
    if (first) prefetchCache.delete(first);
  }
  prefetchCache.set(key, requestSpeakBlob(key));
}

/**
 * Play Maarten MP3 on the shared element.
 * Clears handlers before changing src — otherwise iOS/Chrome fire a false error
 * when aborting the silent keep-alive load.
 */
async function playViaHtmlAudio(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  if (gen !== speakGeneration) return "abort";

  const audio = getSharedAudio();

  // Detach handlers + pause BEFORE swapping src (avoids false onerror)
  audio.onended = null;
  audio.onerror = null;
  audio.oncanplaythrough = null;
  try {
    audio.pause();
  } catch {
    /* ignore */
  }

  revokeObjectUrl();
  const url = URL.createObjectURL(blob);
  objectUrl = url;
  currentAudio = audio;

  audio.loop = false;
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
      if (currentAudio === audio) currentAudio = null;
      window.setTimeout(() => {
        if (objectUrl === url) revokeObjectUrl();
      }, 400);
      resolve(result);
    };

    audio.onended = () => {
      if (gen !== speakGeneration) {
        finish("abort");
        return;
      }
      finish("ok");
      void startSilentKeepAlive();
    };

    // Only treat errors after we've begun loading the new URL
    let armed = false;
    audio.onerror = () => {
      if (armed) finish("fail");
    };

    audio.src = url;
    armed = true;

    void audio.play().then(
      () => {
        /* playing */
      },
      () => {
        // Autoplay blocked — try Web Audio / browser TTS upstream
        finish("fail");
      },
    );
  });
}

async function playViaWebAudio(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  const ctx = getAudioContext();
  if (!ctx) return "fail";

  try {
    await ctx.resume();
  } catch {
    return "fail";
  }
  if (gen !== speakGeneration) return "abort";

  const raw = await blob.arrayBuffer();
  if (gen !== speakGeneration) return "abort";

  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(raw.slice(0));
  } catch {
    return "fail";
  }
  if (gen !== speakGeneration) return "abort";
  if (buffer.duration < 0.12) return "fail";

  stopKeepAliveOsc();
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
      holdSpeechAudioSession();
      void startSilentKeepAlive();
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

/** Last resort — often works on desktop Chrome without a fresh gesture. */
function speakBrowserFallback(
  text: string,
  gen: number,
  opts?: SpeakOpts,
) {
  if (!window.speechSynthesis) {
    opts?.onError?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = "nl-NL";
  utter.rate = 1;

  const voices = synth.getVoices();
  const nl = voices.find((v) => /^nl/i.test(v.lang));
  if (nl) {
    utter.voice = nl;
    utter.lang = nl.lang;
  }

  let finished = false;
  const done = (ok: boolean) => {
    if (finished || gen !== speakGeneration) return;
    finished = true;
    if (ok) opts?.onEnd?.();
    else opts?.onError?.();
  };

  utter.onend = () => done(true);
  utter.onerror = () => done(false);

  // Some engines need a tick after cancel
  window.setTimeout(() => {
    if (gen !== speakGeneration) return;
    synth.speak(utter);
  }, 40);

  // Safety: if the engine silently never starts
  window.setTimeout(() => {
    if (!finished && gen === speakGeneration && !synth.speaking) {
      done(false);
    }
  }, 2500);
}

async function playBlob(
  blob: Blob,
  gen: number,
): Promise<"ok" | "abort" | "fail"> {
  if (gen !== speakGeneration) return "abort";

  const viaEl = await playViaHtmlAudio(blob, gen);
  if (viaEl === "ok" || viaEl === "abort") return viaEl;

  if (gen !== speakGeneration) return "abort";
  return playViaWebAudio(blob, gen);
}

export function speakDutch(text: string, opts?: SpeakOpts): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  stopSpeaking();
  const gen = speakGeneration;
  const trimmed = text.trim();

  holdSpeechAudioSession();

  void (async () => {
    try {
      const blob = await fetchSpeakBlob(trimmed, gen);
      if (gen !== speakGeneration) return;

      if (!blob) {
        speakBrowserFallback(trimmed, gen, opts);
        return;
      }

      await new Promise<void>((r) => window.setTimeout(r, 80));
      if (gen !== speakGeneration) return;

      const ctx = getAudioContext();
      if (ctx?.state === "suspended") {
        await ctx.resume().catch(() => undefined);
      }

      pauseSilentKeepAlive();
      stopKeepAliveOsc();

      const result = await playBlob(blob, gen);
      if (result === "abort") return;
      if (result === "fail") {
        speakBrowserFallback(trimmed, gen, opts);
        return;
      }
      opts?.onEnd?.();
    } catch {
      if (gen === speakGeneration) {
        speakBrowserFallback(trimmed, gen, opts);
      }
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
