export type AdminPreviewMode = "off" | "member" | "visitor";

export const ADMIN_PREVIEW_KEY = "hp_admin_preview";
export const ADMIN_PREVIEW_EVENT = "hp-admin-preview";

export function readAdminPreview(): AdminPreviewMode {
  if (typeof window === "undefined") return "off";
  try {
    const raw = sessionStorage.getItem(ADMIN_PREVIEW_KEY);
    if (raw === "member" || raw === "visitor") return raw;
  } catch {
    /* ignore */
  }
  return "off";
}

export function writeAdminPreview(mode: AdminPreviewMode) {
  try {
    if (mode === "off") sessionStorage.removeItem(ADMIN_PREVIEW_KEY);
    else sessionStorage.setItem(ADMIN_PREVIEW_KEY, mode);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_PREVIEW_EVENT));
  }
}

export function subscribeAdminPreview(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ADMIN_PREVIEW_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ADMIN_PREVIEW_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
