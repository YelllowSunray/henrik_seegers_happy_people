"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Link } from "@/i18n/navigation";

export function JoinButton({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  const { user, isMember } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isMember) {
    return (
      <Link
        href="/members"
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        }
      >
        Happy People
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth?next=/happy-people"
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        }
      >
        {label}
      </Link>
    );
  }

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const token = await user!.getIdToken();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void startCheckout()}
        className={
          className ||
          "inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
        }
      >
        {busy ? "…" : label}
      </button>
      {error && <p className="max-w-xs text-xs text-red-700">{error}</p>}
    </div>
  );
}
