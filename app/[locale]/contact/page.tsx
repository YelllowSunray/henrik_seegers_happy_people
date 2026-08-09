import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section title={t("title")}>
        <p className="max-w-xl text-lg text-ink-soft">{t("body")}</p>
        <a
          href="https://www.facebook.com/hendrik.seegers"
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
        >
          {t("facebook")}
        </a>
      </Section>
    </>
  );
}
