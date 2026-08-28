import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3";

/** Map UI locale → Whisper language code (ISO-639-1). */
function whisperLanguage(locale: string | null): string | undefined {
  if (!locale) return undefined;
  const map: Record<string, string> = {
    nl: "nl",
    en: "en",
    de: "de",
    fr: "fr",
    es: "es",
    it: "it",
    ko: "ko",
    ru: "ru",
    zh: "zh",
    ar: "ar",
  };
  return map[locale] ?? undefined;
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Audio required." }, { status: 400 });
  }
  // ~25 MB Whisper limit; keep a safer cap for abuse
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio too large." }, { status: 400 });
  }

  const locale =
    typeof form.get("locale") === "string"
      ? String(form.get("locale"))
      : null;

  const outbound = new FormData();
  outbound.append("file", file, file.name || "audio.webm");
  outbound.append("model", MODEL);
  outbound.append("response_format", "json");
  const lang = whisperLanguage(locale);
  if (lang) outbound.append("language", lang);

  const groqRes = await fetch(GROQ_TRANSCRIBE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: outbound,
  });

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => "");
    console.error("Groq transcribe error", groqRes.status, errText.slice(0, 500));
    return NextResponse.json(
      { error: "Could not understand the audio." },
      { status: 502 },
    );
  }

  const data = (await groqRes.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "No speech detected." },
      { status: 422 },
    );
  }

  return NextResponse.json({ text });
}
