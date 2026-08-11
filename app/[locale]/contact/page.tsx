import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { FACEBOOK_HREF, WHATSAPP_DISPLAY, WHATSAPP_HREF } from "@/lib/contact";

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
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
          >
            {t("whatsapp")} · {WHATSAPP_DISPLAY}
          </a>
          <a
            href={FACEBOOK_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:bg-bg-deep"
          >
            {t("facebook")}
          </a>
        </div>
      </Section>
    </>
  );
}
