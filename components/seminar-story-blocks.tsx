type StoryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export function SeminarStoryBlocks({ blocks }: { blocks: StoryBlock[] }) {
  return (
    <div className="max-w-2xl space-y-5">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={i}
              className="font-display pt-6 text-2xl text-ink first:pt-0 md:text-3xl"
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-3 pl-1">
              {block.items.map((item) => (
                <li key={item} className="reading-copy flex gap-2">
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
          <p
            key={i}
            className={`reading-copy ${i === 0 ? "reading-copy-ink" : ""}`}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
