import { redirect } from "next/navigation";

export default async function MembersVlogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/vlogs`);
}
