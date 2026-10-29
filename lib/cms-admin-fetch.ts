import { ADMIN_PASSWORD, ADMIN_PASSWORD_HEADER } from "@/lib/admin-gate";

/** Client helper: CMS password gate → admin API. */
export async function cmsAdminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(ADMIN_PASSWORD_HEADER, ADMIN_PASSWORD);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}
