"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/images/ontmoeting-v2.jpg",
  "/images/ontmoeting-alt.jpg",
] as const;

/** Half the interval of SpeedGallery (1200ms → 2400ms). */
const FRAME_MS = 2400;

export function MeetingGallery({ alt }: { alt: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-[3/4] min-h-[16rem] w-full overflow-hidden bg-ink/5">
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          fill
          sizes="(max-width: 1024px) 100vw, 30vw"
          priority={i === 0}
          className={`object-cover object-center transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
