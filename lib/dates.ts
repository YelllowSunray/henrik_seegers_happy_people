/** Normalize Firestore timestamps / ISO strings to `YYYY-MM-DD`. */
export function asDateString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? value.trim();
  }
  if (typeof value === "object") {
    const rec = value as {
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    };
    if (typeof rec.toDate === "function") {
      try {
        return rec.toDate().toISOString().slice(0, 10);
      } catch {
        return "";
      }
    }
    const seconds = rec.seconds ?? rec._seconds;
    if (typeof seconds === "number" && Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString().slice(0, 10);
    }
  }
  return "";
}

export function yearFromDate(publishedAt: string): string | undefined {
  const date = asDateString(publishedAt);
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : undefined;
}
