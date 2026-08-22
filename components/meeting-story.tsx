import { getTranslations } from "next-intl/server";
import { LightboxImage } from "@/components/lightbox-image";

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
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
      <div>
        <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase md:text-base">
          {t("eyebrow")}
        </p>
        <Title className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl md:text-5xl">
          {t("title")}
        </Title>
        <div className="mt-10 space-y-12">
          {blocks.map((block, i) => (
            <article key={`${block.song}-${i}`} className="space-y-4">
              <h3 className="font-display text-xl md:text-2xl">
                <a
                  href={block.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-baseline gap-2 text-accent underline decoration-accent/70 underline-offset-4 transition hover:decoration-accent"
                >
                  <span>{block.song}</span>
                  <span
                    aria-hidden
                    className="text-sm font-semibold tracking-wide no-underline"
                  >
                    ↗
                  </span>
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
      <div className="lg:sticky lg:top-28">
        <LightboxImage
          src="/images/ontmoeting.png"
          alt={t("eyebrow")}
          className="aspect-square min-h-[16rem] w-full"
        />
      </div>
    </div>
  );
}
