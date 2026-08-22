import { getTranslations } from "next-intl/server";
import { MembershipPlans } from "@/components/membership-plans";

export async function MembershipStory({
  titleAs = "h2",
  titleId,
  showPlans = true,
  plansClassName = "mt-10",
}: {
  titleAs?: "h1" | "h2";
  titleId?: string;
  showPlans?: boolean;
  plansClassName?: string;
}) {
  const t = await getTranslations("membership");
  const Title = titleAs;
  const monthlyBenefits = t.raw("monthlyBenefits") as string[];
  const yearlyBenefits = t.raw("yearlyBenefits") as string[];

  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
        {t("eyebrow")}
      </p>
      <Title
        id={titleId}
        className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
      >
        {t("title")}
      </Title>

      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
        {t("pitch")}
      </p>

      <div className="mt-8 max-w-2xl border-l-2 border-accent pl-5">
        <p className="font-display text-xl leading-snug text-ink md:text-2xl">
          {t("belongingTitle")}
        </p>
        <p className="mt-3 text-base leading-relaxed text-ink-soft md:text-lg">
          {t("belongingLead")}
        </p>
      </div>

      <div className="mt-10 space-y-10">
        <section>
          <h3 className="font-display text-xl text-ink md:text-2xl">
            {t("monthlyPlanTitle")}
          </h3>
          <ul className="mt-4 max-w-2xl space-y-2.5 text-base text-ink-soft md:text-lg">
            {monthlyBenefits.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  •
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="font-display text-xl text-ink md:text-2xl">
            {t("yearlyPlanTitle")}
          </h3>
          <p className="mt-3 max-w-2xl text-base text-ink-soft md:text-lg">
            {t("yearlyIntro")}
          </p>
          <ul className="mt-4 max-w-2xl space-y-2.5 text-base text-ink-soft md:text-lg">
            {yearlyBenefits.map((benefit) => (
              <li key={benefit} className="flex gap-2">
                <span aria-hidden className="text-gold">
                  •
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showPlans ? (
        <MembershipPlans className={plansClassName} />
      ) : null}
    </div>
  );
}
