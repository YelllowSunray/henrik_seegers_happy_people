import { getTranslations } from "next-intl/server";
import { CmsField } from "@/components/cms/cms-field";
import { CmsMeetingBlocks } from "@/components/cms/cms-meeting-blocks";
import { MeetingGallery } from "@/components/meeting-gallery";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";
import { cmsText } from "@/lib/homepage-content";
import type { HomepageContent } from "@/lib/homepage-content";

type MeetingBlock = {
  song: string;
  youtube: string;
  text: string;
};

export async function MeetingStory({
  titleAs = "h2",
  titleId,
  cms,
}: {
  titleAs?: "h1" | "h2";
  titleId?: string;
  cms?: HomepageContent["meeting"];
}) {
  const t = await getTranslations("meeting");
  const blocks = (cms?.blocks?.length
    ? cms.blocks
    : (t.raw("blocks") as MeetingBlock[])) as MeetingBlock[];
  const eyebrow = cmsText(cms?.eyebrow, t("eyebrow"));
  const title = cmsText(cms?.title, t("title"));
  const bridge = cmsText(cms?.bridge, t("bridge"));

  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <div className="min-w-0 max-w-full">
        <CmsField
          path="meeting.eyebrow"
          value={eyebrow}
          multiline={false}
          className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base"
        />
        <CmsField
          path="meeting.title"
          value={title}
          as={titleAs}
          id={titleId}
          className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
        />
        <CmsMeetingBlocks blocks={blocks} bridge={bridge} />
        {blocks.length > 0 ? (
          <div className="mt-8 w-full max-w-[41rem]">
            <SyncedLyricPlayer
              audioSrc="/audio/sweet-little-woman.mp3"
              lrcSrc="/audio/sweet-little-woman.lrc"
              title="Sweet Little Woman"
              artist="Joe Cocker"
              tone="page"
            />
          </div>
        ) : null}
        <div className="mt-8 lg:hidden">
          <MeetingGallery alt={eyebrow} />
        </div>
      </div>
      <div className="hidden lg:sticky lg:top-28 lg:block">
        <MeetingGallery alt={eyebrow} />
      </div>
    </div>
  );
}
