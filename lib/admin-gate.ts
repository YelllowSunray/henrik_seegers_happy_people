/** Simple shared admin gate (password-only). */
export const ADMIN_PASSWORD = "admin";
export const ADMIN_SESSION_KEY = "hp_admin_unlocked";
export const ADMIN_PASSWORD_HEADER = "x-admin-password";

export function isValidAdminPassword(password: string | null | undefined) {
  return (password ?? "").trim() === ADMIN_PASSWORD;
}
