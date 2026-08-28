import { NextResponse } from "next/server";
import {
  buildHenkSystemPrompt,
  retrieveHenkChunks,
} from "@/lib/henk-knowledge";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

type ChatTurn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured." },
      { status: 503 },
    );
  }

  let body: {
    message?: string;
    locale?: string;
    history?: ChatTurn[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const message = body.message?.trim() ?? "";
  if (!message || message.length > 4000) {
    return NextResponse.json(
      { error: "Message required (max 4000 characters)." },
      { status: 400 },
    );
  }

  const locale =
    body.locale && /^[a-z]{2}$/.test(body.locale) ? body.locale : "nl";

  const history = (body.history ?? [])
    .filter(
      (t) =>
        (t.role === "user" || t.role === "assistant") &&
        typeof t.content === "string" &&
        t.content.trim().length > 0,
    )
    .slice(-8)
    .map((t) => ({
      role: t.role,
      content: t.content.trim().slice(0, 4000),
    }));

  const chunks = retrieveHenkChunks(message, 6);
  const system = buildHenkSystemPrompt(locale, chunks);

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      temperature: 0.7,
      max_tokens: 450,
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: message },
      ],
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    const errText = await groqRes.text().catch(() => "");
    console.error("Groq error", groqRes.status, errText.slice(0, 500));
    return NextResponse.json(
      { error: "Could not reach Henk right now." },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* skip bad chunk */
            }
          }
        }
      } catch (err) {
        console.error("Groq stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
