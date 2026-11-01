/** Henk + Samir — keep in sync with firestore.rules / storage.rules. */
export const ADMIN_EMAILS = [
  "henk.seegers1965@gmail.com",
  "hendrik.seegers1991@icloud.com",
  "hendrik.seegers@icloud.com",
  "henkseegers196565@hotmail.com",
  "seegershenk79@gmail.com",
  "iyersamir@gmail.com",
] as const;

function extraFromEnv(): string[] {
  const raw = [
    process.env.NEXT_PUBLIC_ADMIN_EMAILS,
    process.env.ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(",");
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowlistedAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  const needle = normalizeEmail(email);
  if ((ADMIN_EMAILS as readonly string[]).includes(needle)) return true;
  return extraFromEnv().includes(needle);
}
