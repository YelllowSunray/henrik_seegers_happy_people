import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { Section } from "@/components/section";
import { MeetingStory } from "@/components/meeting-story";

export default async function MeetingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader variant="solid" />
      <Section tone="default">
        <MeetingStory titleAs="h1" />
      </Section>
    </>
  );
}
