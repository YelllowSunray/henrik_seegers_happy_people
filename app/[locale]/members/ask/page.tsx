import { getTranslations, setRequestLocale } from "next-intl/server";
import { AskHenkChat } from "@/components/ask-henk-chat";

export default async function AskHenkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("askHenk");

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{t("lead")}</p>
      <div className="mt-8">
        <AskHenkChat />
      </div>
    </div>
  );
}
