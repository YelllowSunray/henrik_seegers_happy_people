/** Dutch male speech — neural Maarten voice via API, browser TTS fallback. */

let speakGeneration = 0;
let currentAudio: HTMLAudioElement | null = null;

const FEMALE_HINT =
  /female|vrouw|\bzira\b|\bsusan\b|\bsamantha\b|\bkaren\b|\bmoira\b|\btessa\b|\bfiona\b|\bveena\b|\bellen\b/i;
const MALE_HINT =
  /\bmale\b|\bman\b|\bxander\b|\bruben\b|\bfrank\b|\bdaan\b|\blucas\b|\bthomas\b|\bmark\b|\bdavid\b|\bdaniel\b|microsoft.*(?:bram|coen)|google.*male/i;

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

export function stopSpeaking() {
  speakGeneration += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function canSpeak(): boolean {
  return typeof window !== "undefined";
}

function speakBrowserFallback(
  text: string,
  gen: number,
  opts?: { onEnd?: () => void; onError?: () => void },
) {
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

/**
 * Speak Dutch with a natural male neural voice (Maarten).
 * Falls back to the device speech engine if the API fails.
 */
export function speakDutch(
  text: string,
  opts?: { onEnd?: () => void; onError?: () => void },
): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  stopSpeaking();
  const gen = speakGeneration;
  const trimmed = text.trim();

  void (async () => {
    try {
      const res = await fetch("/api/ask-henk/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error("tts failed");
      const blob = await res.blob();
      if (gen !== speakGeneration) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        if (gen !== speakGeneration) return;
        opts?.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        if (gen !== speakGeneration) return;
        speakBrowserFallback(trimmed, gen, opts);
      };
      await audio.play();
    } catch {
      if (gen !== speakGeneration) return;
      speakBrowserFallback(trimmed, gen, opts);
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
