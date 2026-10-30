import { getTranslations } from "next-intl/server";
import { CmsField, CmsParagraphs } from "@/components/cms/cms-field";
import { MembershipPlans } from "@/components/membership-plans";
import {
  cmsParagraphs,
  cmsText,
  type HomepageContent,
} from "@/lib/homepage-content";

function asParagraphs(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

export async function MembershipStory({
  titleAs = "h2",
  titleId,
  showPlans = true,
  plansClassName = "mt-10",
  cms,
}: {
  titleAs?: "h1" | "h2";
  titleId?: string;
  showPlans?: boolean;
  plansClassName?: string;
  cms?: HomepageContent["membership"];
}) {
  const t = await getTranslations("membership");
  const eyebrow = cmsText(cms?.eyebrow, t("eyebrow"));
  const title = cmsText(cms?.title, t("title"));
  const subtitle = cmsText(
    cms?.subtitle,
    t.has("subtitle") ? t("subtitle") : "",
  );
  const introParagraphs = cmsParagraphs(
    cms?.introParagraphs,
    asParagraphs(t.has("introParagraphs") ? t.raw("introParagraphs") : []),
  );
  const bridgeParagraphs = cmsParagraphs(
    cms?.bridgeParagraphs,
    asParagraphs(t.has("bridgeParagraphs") ? t.raw("bridgeParagraphs") : []),
  );
  const pitch = cmsText(cms?.pitch, t("pitch"));
  const belongingTitle = cmsText(
    cms?.belongingTitle,
    t.has("belongingTitle") ? t("belongingTitle") : "",
  );
  const communityParagraphs = cmsParagraphs(
    cms?.communityParagraphs,
    asParagraphs(
      t.has("communityParagraphs")
        ? t.raw("communityParagraphs")
        : t.has("belongingLead")
          ? [t("belongingLead")]
          : [],
    ),
  );
  const monthlyPlanTitle = cmsText(
    cms?.monthlyPlanTitle,
    t("monthlyPlanTitle"),
  );
  const monthlyBenefits = cmsParagraphs(
    cms?.monthlyBenefits,
    t.raw("monthlyBenefits") as string[],
  );
  const yearlyPlanTitle = cmsText(cms?.yearlyPlanTitle, t("yearlyPlanTitle"));
  const yearlyIntro = cmsText(cms?.yearlyIntro, t("yearlyIntro"));
  const yearlyBenefits = cmsParagraphs(
    cms?.yearlyBenefits,
    t.raw("yearlyBenefits") as string[],
  );

  return (
    <div>
      <CmsField
        path="membership.eyebrow"
        value={eyebrow}
        multiline={false}
        className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
      />
      <CmsField
        path="membership.title"
        value={title}
        as={titleAs}
        id={titleId}
        multiline={false}
        className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl"
      />

      <CmsField
        path="membership.subtitle"
        value={subtitle}
        as="p"
        hideWhenEmpty
        className="font-display mt-4 text-xl leading-snug text-ink md:text-2xl"
      />

      {introParagraphs.length > 0 ? (
        <CmsParagraphs
          path="membership.introParagraphs"
          values={introParagraphs}
          className="mt-8 max-w-2xl space-y-5"
          itemClassName="reading-copy"
        />
      ) : (
        <CmsField
          path="membership.pitch"
          value={pitch}
          className="mt-6 max-w-2xl reading-copy"
        />
      )}

      {bridgeParagraphs.length > 0 ? (
        <CmsParagraphs
          path="membership.bridgeParagraphs"
          values={bridgeParagraphs}
          className="mt-10 max-w-2xl space-y-3 border-l-2 border-accent pl-5"
          itemClassName="reading-copy"
        />
      ) : null}

      {introParagraphs.length > 0 ? (
        <CmsField
          path="membership.pitch"
          value={pitch}
          className="mt-8 max-w-2xl reading-copy"
        />
      ) : null}

      <div className="mt-8 max-w-2xl border-l-2 border-gold pl-5">
        <CmsField
          path="membership.belongingTitle"
          value={belongingTitle}
          as="p"
          hideWhenEmpty
          className="font-display text-xl leading-snug text-ink md:text-2xl"
        />
        <CmsParagraphs
          path="membership.communityParagraphs"
          values={communityParagraphs}
          className="mt-3 space-y-3"
          itemClassName="reading-copy"
        />
      </div>

      <div className="mt-10 space-y-10">
        <section>
          <CmsField
            path="membership.monthlyPlanTitle"
            value={monthlyPlanTitle}
            as="h3"
            multiline={false}
            className="font-display text-xl text-ink md:text-2xl"
          />
          <CmsParagraphs
            path="membership.monthlyBenefits"
            values={monthlyBenefits}
            className="mt-4 max-w-2xl list-disc space-y-2.5 pl-5"
            itemClassName="reading-copy"
            addLabel="+ Voordeel"
            asList
          />
        </section>

        <section>
          <CmsField
            path="membership.yearlyPlanTitle"
            value={yearlyPlanTitle}
            as="h3"
            multiline={false}
            className="font-display text-xl text-ink md:text-2xl"
          />
          <CmsField
            path="membership.yearlyIntro"
            value={yearlyIntro}
            className="mt-3 max-w-2xl reading-copy"
          />
          <CmsParagraphs
            path="membership.yearlyBenefits"
            values={yearlyBenefits}
            className="mt-4 max-w-2xl list-disc space-y-2.5 pl-5"
            itemClassName="reading-copy"
            addLabel="+ Voordeel"
            asList
          />
        </section>
      </div>

      {showPlans ? <MembershipPlans className={plansClassName} /> : null}
    </div>
  );
}
