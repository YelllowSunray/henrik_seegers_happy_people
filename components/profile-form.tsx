"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/auth-provider";
import {
  getClientDb,
  getClientStorage,
  isFirebaseConfigured,
} from "@/lib/firebase/client";
import { computeTrialEndsAt } from "@/lib/membership";

type Mode = "onboarding" | "profile";

export function ProfileForm({
  mode,
  onSaved,
}: {
  mode: Mode;
  onSaved?: () => void;
}) {
  const t = useTranslations("profile");
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName ?? "");
    setPhone(profile.phone ?? "");
    if (!file) setPreview(profile.photoURL ?? null);
  }, [profile, file]);

  function onPickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError(t("photoType"));
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError(t("photoSize"));
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setError(t("required"));
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      let photoURL = profile?.photoURL;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const storageRef = ref(
          getClientStorage(),
          `profiles/${user.uid}/avatar.${ext === "jpeg" ? "jpg" : ext}`,
        );
        await uploadBytes(storageRef, file, { contentType: file.type });
        photoURL = await getDownloadURL(storageRef);
      }

      await setDoc(
        doc(getClientDb(), "members", user.uid),
        {
          uid: user.uid,
          email: user.email ?? profile?.email ?? "",
          displayName: trimmedName,
          phone: trimmedPhone,
          ...(photoURL ? { photoURL } : {}),
          onboardingCompleted: true,
          ...(mode === "onboarding" &&
          !profile?.stripeSubscriptionId &&
          !profile?.trialEndsAt
            ? {
                subscriptionStatus: "trialing" as const,
                trialEndsAt: computeTrialEndsAt(),
              }
            : {}),
        },
        { merge: true },
      );
      await refreshProfile();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-accent";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-6">
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-24 w-24 overflow-hidden rounded-full border border-line bg-bg-deep"
          aria-label={t("photo")}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-ink-soft">
              {t("photoAdd")}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-ink/55 py-1 text-center text-[10px] font-semibold tracking-wide text-white uppercase opacity-0 transition group-hover:opacity-100">
            {t("photoChange")}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{t("photo")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("photoHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <label className="block text-sm font-medium text-ink">
        {t("name")}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          className={fieldClass}
        />
      </label>

      <label className="block text-sm font-medium text-ink">
        {t("phone")}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          type="tel"
          autoComplete="tel"
          placeholder="+31 …"
          className={fieldClass}
        />
      </label>

      {profile?.email && (
        <p className="text-sm text-ink-soft">
          {t("email")}: <span className="text-ink">{profile.email}</span>
        </p>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && mode === "profile" && (
        <p className="text-sm text-accent">{t("saved")}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "…" : mode === "onboarding" ? t("continue") : t("save")}
      </button>
    </form>
  );
}
