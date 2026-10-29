import { NextResponse } from "next/server";
import { synthesizeDutchSpeech } from "@/lib/google-tts.server";

export const runtime = "nodejs";

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
    const buffer = await synthesizeDutchSpeech(text);
    return new NextResponse(new Uint8Array(buffer), {
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
