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
      <h1 className="font-display text-3xl">{tr("quotes")}</h1>
      <ul className="mt-8 space-y-6">
        {quotes.map((q) => (
          <li key={q.id} className="border-l-2 border-gold pl-5">
            <p className="font-display text-2xl leading-snug md:text-3xl">
              “{t(q.text, locale)}”
            </p>
            <p className="mt-3 text-xs text-ink-soft">{q.publishedAt}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
