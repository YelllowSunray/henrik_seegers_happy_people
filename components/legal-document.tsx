import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { legalHref, readLegalMarkdown, type LegalSlug } from "@/lib/legal";
import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`b-${i}`}>{token.slice(2, -2)}</strong>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = legalHref(link[2]);
        const external = href.startsWith("http");
        nodes.push(
          <a
            key={`a-${i}`}
            href={href}
            className="font-semibold text-accent underline-offset-2 hover:underline"
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    i += 1;
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(
        <h1 key={key++} className="font-display text-3xl leading-tight text-ink md:text-5xl">
          {inline(line.slice(2))}
        </h1>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(
        <h2 key={key++} className="font-display mt-10 text-2xl text-ink">
          {inline(line.slice(3))}
        </h2>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(
        <h3 key={key++} className="mt-6 text-lg font-semibold text-ink">
          {inline(line.slice(4))}
        </h3>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      out.push(
        <p key={key++} className="mt-3 text-sm italic text-ink-soft">
          {inline(line.slice(1, -1))}
        </p>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i]!
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^[-: ]+$/.test(c))) rows.push(cells);
        i += 1;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={key++} className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            {head ? (
              <thead>
                <tr>
                  {head.map((cell, ci) => (
                    <th key={ci} className="border border-line bg-bg-deep px-3 py-2 font-semibold">
                      {inline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-line px-3 py-2 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("> ")) {
      const quote = line.startsWith("> ");
      const items: string[] = [];
      while (
        i < lines.length &&
        (quote ? lines[i]!.startsWith("> ") : lines[i]!.startsWith("- "))
      ) {
        items.push(lines[i]!.slice(2));
        i += 1;
      }
      if (quote) {
        out.push(
          <blockquote
            key={key++}
            className="mt-4 border-l-2 border-accent pl-4 text-sm text-ink-soft"
          >
            {items.map((item, qi) => (
              <p key={qi} className="mt-1">
                {inline(item)}
              </p>
            ))}
          </blockquote>,
        );
      } else {
        out.push(
          <ul key={key++} className="mt-3 list-disc space-y-1 pl-5">
            {items.map((item, li) => (
              <li key={li}>{inline(item)}</li>
            ))}
          </ul>,
        );
      }
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        items.push(lines[i]!.replace(/^\d+\.\s/, ""));
        i += 1;
      }
      out.push(
        <ol key={key++} className="mt-3 list-decimal space-y-2 pl-5">
          {items.map((item, li) => (
            <li key={li}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    out.push(
      <p key={key++} className="mt-4 reading-copy">
        {inline(line)}
      </p>,
    );
    i += 1;
  }
  return out;
}

export async function LegalDocument({
  locale,
  slug,
}: {
  locale: string;
  slug: LegalSlug;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const markdown = readLegalMarkdown(slug);
  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <article className="mx-auto max-w-3xl">{renderMarkdown(markdown)}</article>
        <p className="mx-auto mt-12 max-w-3xl text-xs text-ink-soft">{t("draftNote")}</p>
      </Section>
    </>
  );
}
