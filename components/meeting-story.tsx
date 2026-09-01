import { getTranslations } from "next-intl/server";
import { MeetingGallery } from "@/components/meeting-gallery";
import { MeetingYoutubeLink } from "@/components/meeting-youtube-link";
import { SyncedLyricPlayer } from "@/components/synced-lyric-player";

type MeetingBlock = {
  song: string;
  youtube: string;
  text: string;
};

export async function MeetingStory({
  titleAs = "h2",
  titleId,
}: {
  titleAs?: "h1" | "h2";
  titleId?: string;
}) {
  const t = await getTranslations("meeting");
  const blocks = t.raw("blocks") as MeetingBlock[];
  const Title = titleAs;
  const lastIndex = blocks.length - 1;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <div>
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
          {t("eyebrow")}
        </p>
        <Title
          id={titleId}
          className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl"
        >
          {t("title")}
        </Title>
        <div className="mt-10 space-y-12">
          {blocks.map((block, i) => (
            <article key={`${block.song}-${i}`} className="space-y-4">
              <h3 className="font-display text-xl md:text-2xl">
                <MeetingYoutubeLink href={block.youtube} song={block.song} />
              </h3>
              <p className="max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
                {block.text}
              </p>
              {i === lastIndex - 1 && t("bridge").trim() ? (
                <p className="font-display pt-2 text-xl leading-snug text-ink md:text-2xl">
                  {t("bridge")}
                </p>
              ) : null}
              {i === lastIndex ? (
                <>
                  <div className="mt-8 w-full max-w-[41rem]">
                    <SyncedLyricPlayer
                      audioSrc="/audio/sweet-little-woman.mp3"
                      lrcSrc="/audio/sweet-little-woman.lrc"
                      title="Sweet Little Woman"
                      artist="Joe Cocker"
                      tone="page"
                    />
                  </div>
                  <div className="mt-8 lg:hidden">
                    <MeetingGallery alt={t("eyebrow")} />
                  </div>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </div>
      <div className="hidden lg:sticky lg:top-28 lg:block">
        <MeetingGallery alt={t("eyebrow")} />
      </div>
    </div>
  );
}
