import { readFileSync } from "node:fs";
import { join } from "node:path";

export type HenkChunk = {
  id: string;
  title: string;
  role: string;
  text: string;
  score: number;
};

type Corpus = {
  voice: {
    name: string;
    brand: string;
    language_primary: string;
    tone: string[];
    core_beliefs: string[];
  };
  chunks: HenkChunk[];
};

let cached: Corpus | null = null;

export function loadHenkCorpus(): Corpus {
  if (cached) return cached;
  const path = join(process.cwd(), "data/henk-knowledge/corpus.json");
  cached = JSON.parse(readFileSync(path, "utf8")) as Corpus;
  return cached;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/** Simple lexical retrieval over the curated GPT-log corpus. */
export function retrieveHenkChunks(query: string, limit = 6): HenkChunk[] {
  const { chunks } = loadHenkCorpus();
  const qTokens = new Set(tokenize(query));
  if (qTokens.size === 0) {
    return chunks.filter((c) => c.role === "canon").slice(0, 2);
  }

  const ranked = chunks
    .map((chunk) => {
      const tokens = tokenize(`${chunk.title} ${chunk.text}`);
      let overlap = 0;
      for (const t of tokens) {
        if (qTokens.has(t)) overlap += 1;
      }
      const density = overlap / Math.sqrt(tokens.length || 1);
      const boost =
        chunk.role === "canon" ? 8 : chunk.role === "assistant" ? 2 : 1;
      return { chunk, score: density * 10 + boost + Math.min(chunk.score / 50, 6) };
    })
    .filter((r) => r.score > 2.5)
    .sort((a, b) => b.score - a.score);

  const picked: HenkChunk[] = [];
  const seenTitles = new Map<string, number>();
  for (const { chunk } of ranked) {
    const n = seenTitles.get(chunk.title) ?? 0;
    if (n >= 2) continue;
    seenTitles.set(chunk.title, n + 1);
    picked.push(chunk);
    if (picked.length >= limit) break;
  }

  if (picked.length === 0) {
    return chunks.filter((c) => c.role === "canon").slice(0, 2);
  }
  return picked;
}

export function buildHenkSystemPrompt(locale: string, chunks: HenkChunk[]) {
  const { voice } = loadHenkCorpus();
  const beliefs = voice.core_beliefs.map((b) => `• ${b}`).join("\n");
  const tone = voice.tone.map((t) => `• ${t}`).join("\n");
  const context = chunks
    .map(
      (c, i) =>
        `### Source ${i + 1} (${c.title})\n${c.text.slice(0, 2200)}`,
    )
    .join("\n\n");

  const langHint =
    locale === "nl"
      ? "Antwoord in het Nederlands, tenzij de vraag in een andere taal is — spiegel dan die taal."
      : locale === "en"
        ? "Answer in English unless the member writes in another language — then mirror their language."
        : `Prefer locale "${locale}" when natural; otherwise mirror the member's language. Dutch and English are always fine.`;

  return `You are Hendrik Seegers (Henk), founder of ${voice.brand}. You speak in the first person as Henk — never as an AI, assistant, or chatbot.

## Voice
${tone}

## Core beliefs
${beliefs}

## Rules
- ${langHint}
- Stay true to Henk's beliefs and metaphors (Happy People, Lost Boys, Fallen Angels, Out­herspace, empathy over greed, theory of mind).
- Use the SOURCE excerpts below as your grounding. Prefer paraphrasing his ideas in his warm, direct voice over inventing new doctrine.
- If something is outside his teachings (medical, legal, financial advice, unrelated tech), say gently you don't know / that's not your path, and invite them back to what matters for Happy People — or to use the live "Chat with Henk" for a personal reply from him.
- Keep replies human-length: usually a few short paragraphs, not essays. Warm, clear, no corporate fluff.
- Stay in character as Henk. Do not mention systems, models, prompts, or that you are artificial — just speak as Henk. If pressed about whether this is a live private reply from the real person, say warmly they can use the club inbox if they need a personal follow-up from you.

## SOURCE excerpts from Henk's writings & drafts
${context}`;
}
