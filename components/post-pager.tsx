import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function PostPager({
  prev,
  next,
  kind,
}: {
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
  kind: "blog" | "vlogs";
}) {
  const tr = await getTranslations("journal");
  if (!prev && !next) return null;

  return (
    <nav
      aria-label={tr("pager")}
      className="mt-12 grid gap-3 border-t border-line pt-8 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={prev.href}
          className="min-h-16 rounded-xl border border-line bg-white/50 px-4 py-3 hover:border-accent/40"
        >
          <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">
            ← {tr("prev")}
          </p>
          <p className="mt-1 font-display text-lg leading-snug text-ink">
            {prev.title}
          </p>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={next.href}
          className="min-h-16 rounded-xl border border-line bg-white/50 px-4 py-3 text-right hover:border-accent/40"
        >
          <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">
            {tr("next")} →
          </p>
          <p className="mt-1 font-display text-lg leading-snug text-ink">
            {next.title}
          </p>
        </Link>
      ) : null}
      <Link
        href={kind === "blog" ? "/blog" : "/vlogs"}
        className="sm:col-span-2 text-sm font-semibold text-ink-soft hover:text-accent"
      >
        ← {kind === "blog" ? tr("backToBlog") : tr("backToVlogs")}
      </Link>
    </nav>
  );
}
