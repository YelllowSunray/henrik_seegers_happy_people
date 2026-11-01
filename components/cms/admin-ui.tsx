"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useAutosizeTextarea } from "@/components/cms/cms-field";

const FIELD =
  "w-full rounded-2xl border border-line bg-white px-4 py-3.5 text-base leading-relaxed text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function onLeave(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);
}

export function confirmLeave(dirty: boolean, message = "Je hebt nog iets ingevuld. Toch sluiten?") {
  if (!dirty) return true;
  return window.confirm(message);
}

export function confirmDelete(label: string) {
  return window.confirm(
    `“${label || "zonder titel"}” verwijderen?\n\nDit kan niet ongedaan worden gemaakt.`,
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-base font-semibold text-ink">{label}</span>
      {hint ? (
        <span className="mt-1 block text-sm leading-snug text-ink-soft">{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function AdminInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`${FIELD} min-h-12 font-display text-xl sm:text-2xl`}
    />
  );
}

export function AdminTextarea({
  value,
  onChange,
  placeholder,
  minRows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, [value], true);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      placeholder={placeholder}
      onCompositionStart={(event) => {
        event.currentTarget.dataset.composing = "1";
      }}
      onCompositionEnd={(event) => {
        event.currentTarget.dataset.composing = "0";
        onChange(event.currentTarget.value);
      }}
      onChange={(event) => {
        if (event.target.dataset.composing === "1") return;
        onChange(event.target.value);
      }}
      className={`${FIELD} min-h-32 resize-none !whitespace-pre-wrap`}
    />
  );
}

export function AdminSuccess({
  href,
  children,
  linkLabel,
}: {
  href: string;
  children: React.ReactNode;
  linkLabel: string;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-950">
      <p className="text-lg font-semibold">{children}</p>
      <Link
        href={href}
        className="mt-3 inline-flex min-h-12 items-center rounded-full bg-emerald-800 px-5 text-base font-semibold text-white"
      >
        {linkLabel} →
      </Link>
    </div>
  );
}

export function AdminPrimaryButton({
  children,
  busy,
  onClick,
  disabled,
  compact = false,
}: {
  children: React.ReactNode;
  busy?: boolean;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={onClick}
      className={
        compact
          ? "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-accent px-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto sm:px-5"
          : "inline-flex min-h-14 w-full items-center justify-center rounded-full bg-accent px-6 text-lg font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto"
      }
    >
      {children}
    </button>
  );
}

export function AdminGhostButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-base font-medium text-ink-soft disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function AdminDangerButton({
  children,
  onClick,
  disabled,
  compact = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        compact
          ? "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-red-200 bg-red-50 px-2 text-sm font-semibold text-red-700 disabled:opacity-50 sm:w-auto sm:px-5"
          : "inline-flex min-h-12 items-center justify-center rounded-full border border-red-200 bg-red-50 px-5 text-base font-semibold text-red-700 disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}

export function AdminNewButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 text-base font-semibold text-white shadow-sm hover:bg-accent-soft sm:min-h-14 sm:gap-3 sm:text-lg"
    >
      <span aria-hidden className="text-xl leading-none sm:text-2xl">
        +
      </span>
      {children}
    </button>
  );
}

export function AdminCardActions({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-line px-3 py-3 sm:flex sm:flex-row sm:flex-wrap">
      {children}
    </div>
  );
}

export function AdminCardOpenLink({
  href,
  children,
}: {
  href: ComponentProps<typeof Link>["href"];
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line px-2 text-sm font-medium text-ink-soft sm:w-auto sm:px-5"
    >
      {children}
    </Link>
  );
}

export function AdminPreview({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm font-semibold tracking-[0.14em] text-accent uppercase">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function AdminSaveStatus({ status }: { status: string | null }) {
  if (!status) return null;
  const ok = status.startsWith("Opgeslagen");
  return (
    <p className={`text-sm font-medium ${ok ? "text-emerald-800" : "text-ink-soft"}`}>
      {status}
    </p>
  );
}
