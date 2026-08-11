import { getTranslations, setRequestLocale } from "next-intl/server";
import { MemberChat } from "@/components/member-chat";

export default async function MembersChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("chat");

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{t("lead")}</p>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">{t("vsMessages")}</p>
      <div className="mt-8">
        <MemberChat />
      </div>
    </div>
  );
}
