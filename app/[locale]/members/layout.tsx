import { setRequestLocale } from "next-intl/server";
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

  return (
    <>
      <SiteHeader variant="solid" />
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <MembersGate>
          <MembersNav />
          <div className="mt-8">{children}</div>
        </MembersGate>
      </div>
    </>
  );
}
