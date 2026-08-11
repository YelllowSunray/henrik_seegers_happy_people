import { getTranslations, setRequestLocale } from "next-intl/server";
import { t } from "@/lib/content";
import { fetchQuotes } from "@/lib/content-firestore";
import type { Locale } from "@/lib/types";

export default async function MembersQuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as Locale;
  const tr = await getTranslations("members");
  const quotes = await fetchQuotes();

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("inside")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{tr("quotes")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{tr("descQuotes")}</p>
      <ul className="mt-10 space-y-8">
        {quotes.map((q, i) => (
          <li
            key={q.id}
            className={
              i === 0
                ? "bg-ink px-6 py-10 text-white md:px-10 md:py-14"
                : "border-l-2 border-gold pl-5"
            }
          >
            <p
              className={`font-display leading-snug ${
                i === 0 ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"
              }`}
            >
              “{t(q.text, locale)}”
            </p>
            <p
              className={`mt-4 text-xs ${
                i === 0 ? "text-white/50" : "text-ink-soft"
              }`}
            >
              {q.publishedAt}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
