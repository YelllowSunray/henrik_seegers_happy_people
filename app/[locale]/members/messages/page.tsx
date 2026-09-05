import { redirect } from "next/navigation";

export default async function MembersMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/members`);
}
