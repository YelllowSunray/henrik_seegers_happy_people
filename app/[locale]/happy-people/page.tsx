import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { MembershipPlans } from "@/components/membership-plans";
import { LightboxImage } from "@/components/lightbox-image";

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
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {t("eyebrow")}
            </p>
            <h1 className="font-display mt-3 text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              {t("teaser")}
            </p>
            <p className="mt-6 max-w-xl text-lg text-ink">{t("pitch")}</p>
            <p className="mt-3 max-w-xl text-base italic text-ink-soft">
              {t("wordBond")}
            </p>

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
          </div>

          <LightboxImage
            src="/images/image2.jpg"
            alt={t("title")}
            className="mx-auto aspect-[3/4] w-full max-w-sm min-h-[14rem] sm:min-h-[18rem]"
          />
        </div>

        <MembershipPlans className="mt-12" />
      </Section>
    </>
  );
}
