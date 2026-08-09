import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { MembersGate } from "@/components/members-gate";
import { MembersNav } from "@/components/members-nav";

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
      <div className="border-b border-line bg-gradient-to-b from-bg-deep to-bg">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            Happy People
          </p>
          <p className="font-display mt-2 text-2xl text-ink md:text-3xl">
            {tr("hub")}
          </p>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">{tr("subtitle")}</p>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <MembersGate>
          <MembersNav />
          <div className="mt-8">{children}</div>
        </MembersGate>
      </div>
    </>
  );
}
