import { getTranslations, setRequestLocale } from "next-intl/server";
import { VideoList } from "@/components/video-list";
import { fetchVideosByKind } from "@/lib/content-firestore";

export default async function MembersVlogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tr = await getTranslations("members");
  const items = await fetchVideosByKind("vlog");

  return (
    <div>
      <h1 className="font-display text-3xl">{tr("vlogs")}</h1>
      <div className="mt-6">
        <VideoList items={items} />
      </div>
    </div>
  );
}
