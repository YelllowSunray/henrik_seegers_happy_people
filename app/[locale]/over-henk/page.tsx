import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
              {t("eyebrow")}
            </p>
            <h1 className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
              {t("title")}
            </h1>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft md:text-lg">
              <p className="text-ink">{t("lead")}</p>
              <p>{t("p1")}</p>
              <p>{t("p2")}</p>
            </div>
          </div>

          <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5">
            <video
              className="absolute inset-0 h-full w-full object-cover object-top"
              src="/videos/Hendrix_BIO.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Henrik Seegers"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
