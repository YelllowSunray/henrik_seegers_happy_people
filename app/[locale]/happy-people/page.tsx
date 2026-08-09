import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { MembershipPlans } from "@/components/membership-plans";

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
        <p className="max-w-2xl text-lg text-ink-soft sm:text-xl">{t("teaser")}</p>
        <p className="mt-6 max-w-xl text-lg text-ink">{t("pitch")}</p>

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

        <MembershipPlans className="mt-12" />
      </Section>
    </>
  );
}
