import "server-only";

import { getAdminApp } from "@/lib/firebase/admin";

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

/** Chirp 3 HD Dutch male voice; override with HENK_TTS_VOICE. */
export const HENK_VOICE =
  process.env.HENK_TTS_VOICE?.trim() || "nl-NL-Chirp3-HD-Charon";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.token;
  }
  const credential = getAdminApp()?.options.credential;
  if (!credential) throw new Error("Firebase admin credential missing");
  const { access_token, expires_in } = await credential.getAccessToken();
  cachedToken = {
    token: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };
  return access_token;
}

export async function synthesizeDutchSpeech(text: string): Promise<Buffer> {
  const token = await getAccessToken();
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "nl-NL", name: HENK_VOICE },
      audioConfig: { audioEncoding: "MP3" },
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const json = (await res.json().catch(() => null)) as {
    audioContent?: string;
    error?: { message?: string };
  } | null;
  if (!res.ok || !json?.audioContent) {
    throw new Error(json?.error?.message || `Google TTS ${res.status}`);
  }
  return Buffer.from(json.audioContent, "base64");
}
