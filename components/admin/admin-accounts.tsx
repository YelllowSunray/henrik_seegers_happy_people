"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, onSnapshot } from "firebase/firestore";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import {
  MemberIdentity,
  MemberStatusBadge,
} from "@/components/member-status-badge";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { memberDisplayName } from "@/lib/member-status";
import { Link } from "@/i18n/navigation";
import type { MemberProfile } from "@/lib/types";

type AccountRow = MemberProfile & { id: string };

export function AdminAccounts() {
  const t = useTranslations("adminAccounts");
  const ta = useTranslations("admin");
  const { user, isAdmin, loading } = useAuth();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !user || !isAdmin) return;
    return onSnapshot(collection(getClientDb(), "members"), (snap) => {
      setAccounts(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            uid: String(data.uid ?? d.id),
            email: String(data.email ?? ""),
            displayName: data.displayName as string | undefined,
            phone: data.phone as string | undefined,
            photoURL: data.photoURL as string | undefined,
            subscriptionStatus: data.subscriptionStatus,
            membershipPlan: data.membershipPlan,
            trialEndsAt: data.trialEndsAt as string | undefined,
            isAdmin: Boolean(data.isAdmin),
            onboardingCompleted: Boolean(data.onboardingCompleted),
            stripeCustomerId: data.stripeCustomerId as string | undefined,
          } satisfies AccountRow;
        }),
      );
    });
  }, [user, isAdmin]);

  const deletable = useMemo(
    () =>
      accounts
        .filter((a) => !a.isAdmin && a.uid !== user?.uid)
        .sort((a, b) =>
          memberDisplayName(a).localeCompare(memberDisplayName(b)),
        ),
    [accounts, user?.uid],
  );

  async function deleteAccount(row: AccountRow) {
    if (!user || busyUid) return;
    setBusyUid(row.uid);
    setStatus(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: row.uid }),
      });
      const data = (await res.json()) as { error?: string; email?: string };
      if (!res.ok) {
        setStatus(data.error || t("deleteFailed"));
        return;
      }
      setStatus(t("deleted", { email: data.email || row.email || row.uid }));
      setConfirmUid(null);
    } catch {
      setStatus(t("deleteFailed"));
    } finally {
      setBusyUid(null);
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader variant="solid" />
        <p className="p-16 text-center">…</p>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <SiteHeader variant="solid" />
        <div className="mx-auto max-w-lg px-5 py-20 text-center">
          <h1 className="font-display text-3xl">{ta("denied")}</h1>
          <p className="mt-4 text-ink-soft">{ta("signInHint")}</p>
          <Link
            href={user ? "/members" : "/auth"}
            className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white"
          >
            {user ? t("backMembers") : t("signIn")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <header className="border-b border-line pb-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-display mt-2 text-3xl text-ink">{t("title")}</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">{t("lead")}</p>
          <p className="mt-2 text-xs text-ink-soft">{t("stripeNote")}</p>
          <Link
            href="/admin"
            className="mt-4 inline-flex text-sm font-medium text-accent hover:underline"
          >
            {t("backAdmin")}
          </Link>
        </header>

        {status && (
          <p className="mt-6 border border-line bg-bg-deep/40 px-4 py-3 text-sm text-ink">
            {status}
          </p>
        )}

        {deletable.length === 0 ? (
          <p className="mt-10 text-ink-soft">{t("empty")}</p>
        ) : (
          <ul className="mt-8 divide-y divide-line border border-line">
            {deletable.map((row) => {
              const confirming = confirmUid === row.uid;
              const busy = busyUid === row.uid;
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <MemberIdentity profile={row} />
                    <p className="mt-1 truncate font-mono text-[11px] text-ink-soft">
                      {row.uid}
                    </p>
                    <div className="mt-1.5">
                      <MemberStatusBadge profile={row} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {confirming ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteAccount(row)}
                          className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                        >
                          {busy ? "…" : t("confirmDelete")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmUid(null)}
                          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-bg-deep"
                        >
                          {ta("cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(busyUid)}
                        onClick={() => {
                          setStatus(null);
                          setConfirmUid(row.uid);
                        }}
                        className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t("delete")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
