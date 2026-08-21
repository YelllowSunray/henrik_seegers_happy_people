import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { LightboxImage } from "@/components/lightbox-image";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const paragraphs = t.raw("paragraphs") as string[];

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {t("eyebrow")}
            </p>
            <h1 className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-ink-soft md:text-lg">
              {t("teaser")}
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              {paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className={i === 0 ? "text-ink" : undefined}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="lg:sticky lg:top-28">
            <LightboxImage
              src="/images/adhd-pic.jpg"
              alt={t("title")}
              className="aspect-[3/4] min-h-[16rem] w-full"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
