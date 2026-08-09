export type LyricLine = { t: number; text: string };

/** Parse [mm:ss.xx] LRC timestamps into seconds. */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const match = raw.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/);
    if (!match) continue;
    const minutes = Number(match[1]);
    const seconds = Number(match[2]);
    const fraction = match[3] ?? "0";
    const ms =
      fraction.length === 1
        ? Number(fraction) * 100
        : fraction.length === 2
          ? Number(fraction) * 10
          : Number(fraction.padEnd(3, "0").slice(0, 3));
    const text = match[4].trim();
    if (!text) continue;
    lines.push({ t: minutes * 60 + seconds + ms / 1000, text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

export function activeLyricIndex(lines: LyricLine[], time: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.t <= time) idx = i;
    else break;
  }
  return idx;
}
