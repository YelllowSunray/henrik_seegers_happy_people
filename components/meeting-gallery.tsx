"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/images/ontmoeting-1.jpg",
  "/images/ontmoeting-2.jpg",
  "/images/ontmoeting-3.jpg",
] as const;

/** Slower than Lidmaatschap carousel (1200ms): 4s per image */
const FRAME_MS = 4000;

export function MeetingGallery({
  alt,
  className = "",
}: {
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={`relative aspect-[3/4] min-h-[16rem] w-full overflow-hidden bg-ink/5 ${className}`}
    >
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === index ? alt : ""}
          fill
          sizes="(max-width: 1024px) 100vw, 30vw"
          priority={i === 0}
          className={`object-cover object-center transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
