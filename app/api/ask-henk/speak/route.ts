import { NextResponse } from "next/server";
import { EdgeTTS } from "edge-tts-universal";

export const runtime = "nodejs";

/** Natural Dutch male neural voice (Microsoft Edge TTS). */
const DUTCH_MALE_VOICE = "nl-NL-MaartenNeural";

export async function POST(req: Request) {
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text || text.length > 2500) {
    return NextResponse.json(
      { error: "Text required (max 2500 characters)." },
      { status: 400 },
    );
  }

  try {
    const tts = new EdgeTTS(text, DUTCH_MALE_VOICE, {
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%",
    });
    const result = await tts.synthesize();
    const audio = result.audio;
    const buffer = Buffer.from(await audio.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Dutch TTS error", err);
    return NextResponse.json(
      { error: "Could not generate speech." },
      { status: 502 },
    );
  }
}
