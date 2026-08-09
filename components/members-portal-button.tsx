"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";

export function MembersPortalButton() {
  const tr = useTranslations("members");
  const { user } = useAuth();

  async function openPortal() {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { url?: string };
    if (data.url) window.location.href = data.url;
  }

  return (
    <button
      type="button"
      onClick={() => void openPortal()}
      className="mt-10 text-sm text-accent underline-offset-4 hover:underline"
    >
      {tr("manageBilling")}
    </button>
  );
}
