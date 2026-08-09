"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/components/auth-provider";
import { getClientDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { Link } from "@/i18n/navigation";

type Tab = "posts" | "videos" | "quotes" | "messages" | "events";

const fieldClass =
  "w-full border border-line bg-white/70 px-3 py-2 text-sm outline-none focus:border-accent";
const btnClass =
  "inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-soft";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("posts");
  const [status, setStatus] = useState<string | null>(null);

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
          <p>{t("denied")}</p>
          <p className="mt-4 text-sm text-ink-soft">
            Set NEXT_PUBLIC_ADMIN_EMAILS to your email, or set isAdmin on the
            member doc in Firestore.
          </p>
          <Link href="/auth" className="mt-6 inline-block text-accent">
            Sign in
          </Link>
        </div>
      </>
    );
  }

  async function save(col: string, data: Record<string, unknown>) {
    if (!isFirebaseConfigured) {
      setStatus(
        "Firebase not configured — seed content lives in lib/content.ts.",
      );
      return;
    }
    setStatus("Saving…");
    try {
      await addDoc(collection(getClientDb(), col), {
        ...data,
        createdAt: serverTimestamp(),
      });
      setStatus("Saved to Firestore.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function onPost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await save("posts", {
      slug: String(fd.get("slug")),
      title: { nl: String(fd.get("title")) },
      excerpt: { nl: String(fd.get("excerpt")) },
      body: { nl: String(fd.get("body")) },
      membersOnly: fd.get("membersOnly") === "on",
      publishedAt: new Date().toISOString().slice(0, 10),
    });
    e.currentTarget.reset();
  }

  async function onVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await save("videos", {
      title: { nl: String(fd.get("title")) },
      description: { nl: String(fd.get("description")) },
      kind: String(fd.get("kind")),
      videoUrl: String(fd.get("videoUrl") || ""),
      durationLabel: String(fd.get("duration") || ""),
      publishedAt: new Date().toISOString().slice(0, 10),
    });
    e.currentTarget.reset();
  }

  async function onQuote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await save("quotes", {
      text: { nl: String(fd.get("text")) },
      publishedAt: new Date().toISOString().slice(0, 10),
    });
    e.currentTarget.reset();
  }

  async function onMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await save("personalMessages", {
      toEmail: String(fd.get("toEmail")),
      subject: { nl: String(fd.get("subject")) },
      body: { nl: String(fd.get("body")) },
      read: false,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    e.currentTarget.reset();
  }

  async function onEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await save("events", {
      title: { nl: String(fd.get("title")) },
      description: { nl: String(fd.get("description")) },
      date: String(fd.get("date")),
      time: String(fd.get("time")),
      location: String(fd.get("location") || "Almere"),
    });
    e.currentTarget.reset();
  }

  const tabs: Tab[] = ["posts", "videos", "quotes", "messages", "events"];

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{user.email}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                tab === key
                  ? "bg-accent text-white"
                  : "border border-line text-ink-soft"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {status && <p className="mt-6 text-sm text-accent">{status}</p>}

        <div className="mt-8 space-y-3">
          {tab === "posts" && (
            <form onSubmit={onPost} className="space-y-3">
              <input name="slug" placeholder="slug" required className={fieldClass} />
              <input name="title" placeholder="Title" required className={fieldClass} />
              <input name="excerpt" placeholder="Excerpt" required className={fieldClass} />
              <textarea name="body" placeholder="Body" required rows={6} className={fieldClass} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="membersOnly" /> Members only
              </label>
              <button type="submit" className={btnClass}>
                Publish post
              </button>
            </form>
          )}

          {tab === "videos" && (
            <form onSubmit={onVideo} className="space-y-3">
              <input name="title" placeholder="Title" required className={fieldClass} />
              <input name="description" placeholder="Description" className={fieldClass} />
              <select name="kind" className={fieldClass} defaultValue="seminar">
                <option value="seminar">Seminar recording</option>
                <option value="vlog">Vlog / personal video</option>
                <option value="sample">Public sample</option>
              </select>
              <input name="videoUrl" placeholder="Embed URL" className={fieldClass} />
              <input name="duration" placeholder="Duration e.g. 8 min" className={fieldClass} />
              <button type="submit" className={btnClass}>
                Save video
              </button>
            </form>
          )}

          {tab === "quotes" && (
            <form onSubmit={onQuote} className="space-y-3">
              <textarea
                name="text"
                placeholder="Quote / short message"
                required
                rows={4}
                className={fieldClass}
              />
              <button type="submit" className={btnClass}>
                Save quote
              </button>
            </form>
          )}

          {tab === "messages" && (
            <form onSubmit={onMessage} className="space-y-3">
              <input
                name="toEmail"
                type="email"
                placeholder="Member email"
                required
                className={fieldClass}
              />
              <input name="subject" placeholder="Subject" required className={fieldClass} />
              <textarea
                name="body"
                placeholder="Personal message from Henk"
                required
                rows={5}
                className={fieldClass}
              />
              <button type="submit" className={btnClass}>
                Send to member inbox
              </button>
            </form>
          )}

          {tab === "events" && (
            <form onSubmit={onEvent} className="space-y-3">
              <input name="title" placeholder="Seminar title" required className={fieldClass} />
              <textarea
                name="description"
                placeholder="Description"
                required
                rows={4}
                className={fieldClass}
              />
              <input name="date" type="date" required className={fieldClass} />
              <input name="time" placeholder="14:00–17:00" required className={fieldClass} />
              <input name="location" placeholder="Almere" className={fieldClass} />
              <button type="submit" className={btnClass}>
                Save seminar
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
