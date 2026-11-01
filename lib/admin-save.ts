export type AdminJson = {
  ok?: boolean;
  error?: string;
  video?: { id?: string };
  post?: { id?: string };
};

/** Never throw on empty/HTML bodies — callers must still check res.ok + id. */
export async function readAdminJson<T extends AdminJson = AdminJson>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/** Success only after the server wrote a document and returned its id. */
export function isAdminCreateSuccess(
  res: Response,
  data: AdminJson,
  kind: "vlog" | "blog",
): boolean {
  const id = kind === "vlog" ? data.video?.id : data.post?.id;
  return Boolean(res.ok && data.ok && id);
}

export function adminSaveError(
  res: Response,
  data: AdminJson,
  kind: "vlog" | "blog",
): string {
  const noun = kind === "vlog" ? "vlog" : "bericht";
  const raw = data.error?.trim() ?? "";
  if (/unauthorized/i.test(raw) || res.status === 401) {
    return `Niet gemachtigd. De ${noun} is niet opgeslagen.`;
  }
  if (/not configured|Firebase admin/i.test(raw) || res.status === 503) {
    return `De database is niet bereikbaar. De ${noun} is niet opgeslagen.`;
  }
  if (raw) return raw;
  if (!res.ok) {
    return `Opslaan mislukt (fout ${res.status}). De ${noun} is niet opgeslagen.`;
  }
  return `Opslaan mislukt. De ${noun} is niet opgeslagen.`;
}
