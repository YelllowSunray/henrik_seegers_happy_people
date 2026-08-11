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
      <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">
        {tr("inside")}
      </p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{tr("vlogs")}</h1>
      <p className="mt-3 max-w-xl text-ink-soft">{tr("descVlogs")}</p>
      <div className="mt-10">
        <VideoList items={items} />
      </div>
    </div>
  );
}
