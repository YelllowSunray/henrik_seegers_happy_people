import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { MembersShell } from "@/components/members-shell";

export default async function MembersLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tr = await getTranslations("members");

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/seminar.png)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(15,40,36,0.92) 0%, rgba(15,40,36,0.78) 42%, rgba(15,40,36,0.55) 100%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <p className="reveal text-xs font-semibold tracking-[0.22em] text-gold uppercase">
            {tr("inside")}
          </p>
          <p className="reveal reveal-delay-1 font-display mt-3 text-4xl text-white md:text-6xl">
            {tr("hub")}
          </p>
          <p className="reveal reveal-delay-2 mt-3 max-w-lg text-base text-white/80 md:text-lg">
            {tr("subtitle")}
          </p>
          <div className="reveal reveal-delay-3 mt-6 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 uppercase backdrop-blur">
              {tr("pillLive")}
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 uppercase backdrop-blur">
              {tr("pillChat")}
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 uppercase backdrop-blur">
              {tr("pillNew")}
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        <MembersShell>{children}</MembersShell>
      </div>
    </>
  );
}
