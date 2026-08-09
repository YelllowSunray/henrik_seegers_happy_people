import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("membership");

  const benefits = [
    t("benefitSeminars"),
    t("benefitVlogs"),
    t("benefitQuotes"),
    t("benefitTeachings"),
    t("benefitMessages"),
  ];

  return (
    <>
      <SiteHeader variant="solid" />
      <Section eyebrow={t("eyebrow")} title={t("title")}>
        <p className="max-w-2xl text-xl text-ink-soft">{t("teaser")}</p>
        <p className="font-display mt-6 text-4xl text-accent">
          {t("price")}
        </p>
        <p className="mt-2 text-ink-soft">{t("trial")}</p>
        <p className="mt-8 max-w-xl text-lg">{t("pitch")}</p>

        <ul className="mt-10 max-w-lg space-y-4">
          {benefits.map((b) => (
            <li
              key={b}
              className="border-l-2 border-accent pl-4 text-base text-ink"
            >
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <JoinButton label={t("cta")} />
        </div>
      </Section>
    </>
  );
}
