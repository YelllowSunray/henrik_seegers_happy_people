/**
 * Rebuild curated knowledge corpus from ChatGPT export.
 * Usage: node scripts/build-henk-corpus.mjs
 *
 * Reads: data/gptlogs/conversations.json
 * Writes: data/henk-knowledge/corpus.json
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const src = join(root, "data/gptlogs/conversations.json");
if (!existsSync(src)) {
  console.error("Missing", src);
  console.error("Place the ChatGPT export at data/gptlogs/conversations.json");
  process.exit(1);
}

const py = `
import json, re, hashlib
from pathlib import Path
from collections import Counter

def extract_text(parts):
    out=[]
    for p in parts or []:
        if isinstance(p,str):
            out.append(p)
        elif isinstance(p,dict):
            if p.get('content_type')=='audio_transcription' and p.get('text'):
                out.append(p['text'])
            elif isinstance(p.get('text'),str):
                out.append(p['text'])
    return '\\n'.join(out).strip()

KEEP = re.compile(
    r'boodschap|empath|manifest|happy|lost|fallen|seminar|biograf|about henk|spirit|twin|natuurlijker|tekst|lidmaatschap|greeting|ontmoeting|menselijkheid|schrijven|redigeren|zin |aura|prijs spirit|poëtisch|titelvoorstel|inschrijven|versterken',
    re.I,
)
DROP = re.compile(
    r'digid|betal|rekening|aanman|grill|foto|afbeelding|bijsnijd|youtube|liedje|telefoon|googleaccount|cannock|helpdesk|merk en type',
    re.I,
)
SPIRIT = re.compile(
    r'happy people|lost boys|fallen angels|outherspace|empath|theory of mind|theorie van|seminar|enlighten|ziel|bewust|menselijkheid|hebzucht|verenigen|herenigen|twin flame|boodschap|ontwaken|gezegend|eerlijk',
    re.I,
)

data = json.loads(Path('data/gptlogs/conversations.json').read_text())
chunks = []
seen = set()

def add_chunk(title, role, text, score):
    text = re.sub(r'\\n{3,}', '\\n\\n', text).strip()
    if len(text) < 120:
        return
    key = hashlib.md5(text[:500].encode()).hexdigest()
    if key in seen:
        return
    seen.add(key)
    chunks.append({
        "id": key[:12],
        "title": title or "Untitled",
        "role": role,
        "text": text[:4500],
        "score": score,
    })

for c in data:
    title = c.get('title') or ''
    if DROP.search(title) and not KEEP.search(title):
        continue
    nodes = []
    for nid, node in (c.get('mapping') or {}).items():
        msg = node.get('message')
        if not msg: continue
        role = (msg.get('author') or {}).get('role')
        if role not in ('user','assistant'): continue
        t = extract_text((msg.get('content') or {}).get('parts'))
        if not t: continue
        ct = msg.get('create_time') or 0
        nodes.append((ct, role, t))
    nodes.sort(key=lambda x: x[0] or 0)
    for ct, role, t in nodes:
        hits = len(SPIRIT.findall(t))
        if hits < 2 and len(t) < 400:
            continue
        if hits == 0 and not KEEP.search(title):
            continue
        if re.search(r'^(kan je|please|verwijder|knip|crop|draai|rotate)', t.strip(), re.I) and hits < 3:
            continue
        score = hits * 10 + min(len(t)//50, 40)
        if KEEP.search(title):
            score += 15
        add_chunk(title, role, t, score)

chunks.sort(key=lambda x: -x['score'])
selected = []
title_counts = {}
for ch in chunks:
    t = ch['title']
    title_counts[t] = title_counts.get(t, 0) + 1
    if title_counts[t] > 8:
        continue
    selected.append(ch)
    if len(selected) >= 120:
        break

for loc in ['nl','en']:
    p = Path(f'messages/{loc}.json')
    if p.exists():
        m = json.loads(p.read_text())
        msg = m.get('message', {})
        paras = msg.get('paragraphs') or []
        body = '\\n\\n'.join([msg.get('short',''), msg.get('body',''), *paras])
        selected.insert(0, {
            "id": f'site-{loc}',
            "title": f'site-message-{loc}',
            "role": 'canon',
            "text": body[:4500],
            "score": 999,
        })

voice = {
    "name": "Hendrik Seegers (Henk)",
    "brand": "Happy People",
    "language_primary": "nl",
    "language_also": ["en"],
    "tone": [
        "Warm, direct, personal — speaks as himself in first person",
        "Poetic but plain; not academic or corporate",
        "Uses images: Out­herspace, Lost Boys, Fallen Angels, Happy People path",
        "Empathy over greed; theory of mind; keep your word; honest trade",
        "Gentle invitations, not pressure or hard sell",
        "Short punchy lines mixed with longer reflective paragraphs",
        "Often Dutch with occasional English phrases (YES or NO, Happy People)",
    ],
    "core_beliefs": [
        "Path of the Happy People: honest trade, keep your word, empathy instead of greed",
        "Theory of mind: every person has their own inner world",
        "Lost Boys and Fallen Angels can find their way back and reunite",
        "He comes from Out­herspace to help people who are stuck",
        "Simple actions can help — even a five-year-old can learn them",
        "Greatest change starts by understanding the person next to you",
        "Membership is no pressure: YES or NO, the choice is yours",
    ],
}

out = {
    "voice": voice,
    "chunks": selected,
    "meta": {"source_conversations": len(data), "chunk_count": len(selected)},
}
out_path = Path('data/henk-knowledge/corpus.json')
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
print(f"Wrote {out_path} ({len(selected)} chunks, {sum(len(c['text']) for c in selected)} chars)")
print(Counter(c['title'] for c in selected).most_common(10))
`

const r = spawnSync("python3", ["-c", py], { cwd: root, encoding: "utf8" });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
