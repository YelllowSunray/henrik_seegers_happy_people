type StoryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function SeminarStoryBlocks({ blocks }: { blocks: StoryBlock[] }) {
  return (
    <div className="max-w-2xl space-y-4 text-base leading-relaxed text-ink-soft md:text-lg">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={i}
              className="font-display pt-6 text-xl text-ink first:pt-0 md:text-2xl"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-accent">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={i === 0 ? "text-ink" : undefined}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
