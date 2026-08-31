"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useTranslations } from "next-intl";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  getDefaultHomepageContent,
  HOMEPAGE_DOC_PATH,
  parseHomepageContent,
  paragraphsToTextarea,
  textareaToParagraphs,
  type HomepageContent,
  type MeetingBlockContent,
} from "@/lib/homepage-content";

const fieldClass =
  "mt-1.5 w-full border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-accent";
const labelClass = "block text-sm font-medium text-ink";
const btnClass =
  "inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft disabled:opacity-50";
const sectionClass =
  "space-y-4 rounded-lg border border-line bg-white/60 p-5 sm:p-6";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={labelClass}>
      {label}
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-ink-soft">
          {hint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function AdminHomepageForm({
  disabled,
  onStatus,
}: {
  disabled: boolean;
  onStatus: (message: string | null) => void;
}) {
  const t = useTranslations("admin");
  const defaults = useMemo(() => getDefaultHomepageContent(), []);
  const [content, setContent] = useState<HomepageContent>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoaded(true);
      onStatus("Firebase not configured.");
      return;
    }
    const db = getClientDb();
    const ref = doc(db, HOMEPAGE_DOC_PATH.collection, HOMEPAGE_DOC_PATH.id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setContent(parseHomepageContent(snap.data() as Record<string, unknown>));
        } else {
          setContent(defaults);
        }
        setLoaded(true);
      },
      (err) => {
        onStatus(err.message || "Could not load homepage content.");
        setLoaded(true);
      },
    );
    return () => unsub();
  }, [defaults, onStatus]);

  function updateHero<K extends keyof HomepageContent["hero"]>(
    key: K,
    value: HomepageContent["hero"][K],
  ) {
    setContent((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  }

  function updateMessage<K extends keyof HomepageContent["message"]>(
    key: K,
    value: HomepageContent["message"][K],
  ) {
    setContent((prev) => ({
      ...prev,
      message: { ...prev.message, [key]: value },
    }));
  }

  function updateAbout<K extends keyof HomepageContent["about"]>(
    key: K,
    value: HomepageContent["about"][K],
  ) {
    setContent((prev) => ({ ...prev, about: { ...prev.about, [key]: value } }));
  }

  function updateMeetingField<K extends "eyebrow" | "title" | "bridge">(
    key: K,
    value: string,
  ) {
    setContent((prev) => ({
      ...prev,
      meeting: { ...prev.meeting, [key]: value },
    }));
  }

  function updateMeetingBlock(
    index: number,
    patch: Partial<MeetingBlockContent>,
  ) {
    setContent((prev) => {
      const blocks = prev.meeting.blocks.map((block, i) =>
        i === index ? { ...block, ...patch } : block,
      );
      return { ...prev, meeting: { ...prev.meeting, blocks } };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (disabled) {
      onStatus(t("blocked"));
      return;
    }
    if (!isFirebaseConfigured) {
      onStatus("Firebase not configured.");
      return;
    }
    setSaving(true);
    onStatus(t("homepageSaving"));
    try {
      const db = getClientDb();
      await setDoc(
        doc(db, HOMEPAGE_DOC_PATH.collection, HOMEPAGE_DOC_PATH.id),
        {
          ...content,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      onStatus(t("homepageSaved"));
    } catch (err) {
      onStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    if (!window.confirm(t("homepageResetConfirm"))) return;
    setContent(defaults);
    onStatus(t("homepageResetHint"));
  }

  if (!loaded) {
    return <p className="text-sm text-ink-soft">…</p>;
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="space-y-8">
      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageHero")}</h3>
        <Field label={t("homepageBrand")}>
          <input
            className={fieldClass}
            value={content.hero.brand}
            onChange={(e) => updateHero("brand", e.target.value)}
          />
        </Field>
        <Field label={t("homepageHeadline")}>
          <input
            className={fieldClass}
            value={content.hero.headline}
            onChange={(e) => updateHero("headline", e.target.value)}
          />
        </Field>
        <Field label={t("homepageSupport")}>
          <input
            className={fieldClass}
            value={content.hero.support}
            onChange={(e) => updateHero("support", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("homepageCtaJoin")}>
            <input
              className={fieldClass}
              value={content.hero.ctaJoin}
              onChange={(e) => updateHero("ctaJoin", e.target.value)}
            />
          </Field>
          <Field label={t("homepageCtaSeminar")}>
            <input
              className={fieldClass}
              value={content.hero.ctaSeminar}
              onChange={(e) => updateHero("ctaSeminar", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageMessage")}</h3>
        <Field label={t("homepageEyebrow")}>
          <input
            className={fieldClass}
            value={content.message.eyebrow}
            onChange={(e) => updateMessage("eyebrow", e.target.value)}
          />
        </Field>
        <Field label={t("fieldTitle")}>
          <textarea
            className={fieldClass}
            rows={2}
            value={content.message.title}
            onChange={(e) => updateMessage("title", e.target.value)}
          />
        </Field>
        <Field label={t("homepageShort")}>
          <textarea
            className={fieldClass}
            rows={3}
            value={content.message.short}
            onChange={(e) => updateMessage("short", e.target.value)}
          />
        </Field>
        <Field
          label={t("homepageParagraphs")}
          hint={t("homepageParagraphsHint")}
        >
          <textarea
            className={fieldClass}
            rows={14}
            value={paragraphsToTextarea(content.message.paragraphs)}
            onChange={(e) =>
              updateMessage("paragraphs", textareaToParagraphs(e.target.value))
            }
          />
        </Field>
      </section>

      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageAbout")}</h3>
        <Field label={t("homepageEyebrow")}>
          <input
            className={fieldClass}
            value={content.about.eyebrow}
            onChange={(e) => updateAbout("eyebrow", e.target.value)}
          />
        </Field>
        <Field label={t("fieldTitle")}>
          <input
            className={fieldClass}
            value={content.about.title}
            onChange={(e) => updateAbout("title", e.target.value)}
          />
        </Field>
        <Field label={t("homepageTeaser")}>
          <input
            className={fieldClass}
            value={content.about.teaser}
            onChange={(e) => updateAbout("teaser", e.target.value)}
          />
        </Field>
        <Field label={t("homepageReadMore")}>
          <input
            className={fieldClass}
            value={content.about.readMore}
            onChange={(e) => updateAbout("readMore", e.target.value)}
          />
        </Field>
        <Field
          label={t("homepageParagraphs")}
          hint={t("homepageParagraphsHint")}
        >
          <textarea
            className={fieldClass}
            rows={16}
            value={paragraphsToTextarea(content.about.paragraphs)}
            onChange={(e) =>
              updateAbout("paragraphs", textareaToParagraphs(e.target.value))
            }
          />
        </Field>
      </section>

      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageMeeting")}</h3>
        <Field label={t("homepageEyebrow")}>
          <input
            className={fieldClass}
            value={content.meeting.eyebrow}
            onChange={(e) => updateMeetingField("eyebrow", e.target.value)}
          />
        </Field>
        <Field label={t("fieldTitle")}>
          <textarea
            className={fieldClass}
            rows={3}
            value={content.meeting.title}
            onChange={(e) => updateMeetingField("title", e.target.value)}
          />
        </Field>
        <Field label={t("homepageBridge")}>
          <input
            className={fieldClass}
            value={content.meeting.bridge}
            onChange={(e) => updateMeetingField("bridge", e.target.value)}
          />
        </Field>
        <div className="space-y-5">
          <p className="text-sm font-semibold text-ink">
            {t("homepageMeetingBlocks")}
          </p>
          {content.meeting.blocks.map((block, index) => (
            <div
              key={`meeting-block-${index}`}
              className="space-y-3 rounded-md border border-line bg-bg/40 p-4"
            >
              <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
                {t("homepageBlockN", { n: index + 1 })}
              </p>
              <Field label={t("homepageSong")}>
                <input
                  className={fieldClass}
                  value={block.song}
                  onChange={(e) =>
                    updateMeetingBlock(index, { song: e.target.value })
                  }
                />
              </Field>
              <Field label={t("homepageYoutube")}>
                <input
                  className={fieldClass}
                  value={block.youtube}
                  onChange={(e) =>
                    updateMeetingBlock(index, { youtube: e.target.value })
                  }
                />
              </Field>
              <Field label={t("fieldBody")}>
                <textarea
                  className={fieldClass}
                  rows={3}
                  value={block.text}
                  onChange={(e) =>
                    updateMeetingBlock(index, { text: e.target.value })
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageExtras")}</h3>
        <Field label={t("homepageImageCaption")}>
          <textarea
            className={fieldClass}
            rows={2}
            value={content.seminars.imageCaption}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                seminars: { imageCaption: e.target.value },
              }))
            }
          />
        </Field>
        <Field label={t("homepageParadisePrompt")}>
          <textarea
            className={fieldClass}
            rows={2}
            value={content.membership.paradisePrompt}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                membership: {
                  ...prev.membership,
                  paradisePrompt: e.target.value,
                },
              }))
            }
          />
        </Field>
        <Field label={t("homepageParadiseNote")}>
          <textarea
            className={fieldClass}
            rows={2}
            value={content.membership.paradiseNote}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                membership: {
                  ...prev.membership,
                  paradiseNote: e.target.value,
                },
              }))
            }
          />
        </Field>
      </section>

      <section className={sectionClass}>
        <h3 className="font-display text-xl text-ink">{t("homepageDonate")}</h3>
        <Field label={t("homepageEyebrow")}>
          <input
            className={fieldClass}
            value={content.donate.eyebrow}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                donate: { ...prev.donate, eyebrow: e.target.value },
              }))
            }
          />
        </Field>
        <Field label={t("fieldTitle")}>
          <input
            className={fieldClass}
            value={content.donate.title}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                donate: { ...prev.donate, title: e.target.value },
              }))
            }
          />
        </Field>
        <Field label={t("homepageLead")}>
          <textarea
            className={fieldClass}
            rows={3}
            value={content.donate.lead}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                donate: { ...prev.donate, lead: e.target.value },
              }))
            }
          />
        </Field>
        <Field label={t("fieldBody")}>
          <textarea
            className={fieldClass}
            rows={3}
            value={content.donate.body}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                donate: { ...prev.donate, body: e.target.value },
              }))
            }
          />
        </Field>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className={btnClass}
          disabled={disabled || saving}
        >
          {saving ? t("homepageSaving") : t("save")}
        </button>
        <button
          type="button"
          className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-bg-deep"
          onClick={resetToDefaults}
          disabled={saving}
        >
          {t("homepageReset")}
        </button>
      </div>
    </form>
  );
}
