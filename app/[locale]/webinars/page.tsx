import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { JoinButton } from "@/components/join-button";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "webinars" });
  return buildPageMetadata({
    locale: locale as Locale,
    pathname: "/webinars",
    title: t("title"),
    description: t("lead"),
  });
}

export default async function WebinarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("webinars");
  const tNav = await getTranslations("nav");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section>
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight text-ink md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
          {t("lead")}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink md:text-lg">
          {t("body")}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <JoinButton
            label={t("cta")}
            className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-soft"
          />
          <Link
            href="/happy-people"
            className="text-sm font-semibold text-ink underline-offset-4 hover:text-accent hover:underline"
          >
            {tNav("community")}
          </Link>
        </div>
      </Section>
    </>
  );
}
