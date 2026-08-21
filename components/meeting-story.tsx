import { getTranslations } from "next-intl/server";

type MeetingBlock = {
  song: string;
  youtube: string;
  text: string;
};

export async function MeetingStory({
  titleAs = "h2",
}: {
  titleAs?: "h1" | "h2";
}) {
  const t = await getTranslations("meeting");
  const blocks = t.raw("blocks") as MeetingBlock[];
  const Title = titleAs;

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
        {t("eyebrow")}
      </p>
      <Title className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
        {t("title")}
      </Title>
      <div className="mt-10 space-y-12">
        {blocks.map((block, i) => (
          <article key={`${block.song}-${i}`} className="space-y-4">
            <h3 className="font-display text-xl text-ink md:text-2xl">
              <a
                href={block.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                {block.song}
              </a>
            </h3>
            <p className="max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              {block.text}
            </p>
            {i === blocks.length - 2 ? (
              <p className="font-display pt-2 text-xl leading-snug text-ink md:text-2xl">
                {t("bridge")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
