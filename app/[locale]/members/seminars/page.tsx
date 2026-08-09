import { getTranslations, setRequestLocale } from "next-intl/server";
import { VideoList } from "@/components/video-list";
import { fetchVideosByKind } from "@/lib/content-firestore";

export default async function MembersSeminarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tr = await getTranslations("members");
  const items = await fetchVideosByKind("seminar");

  return (
    <div>
      <h1 className="font-display text-3xl">{tr("seminars")}</h1>
      <div className="mt-6">
        <VideoList items={items} />
      </div>
    </div>
  );
}
