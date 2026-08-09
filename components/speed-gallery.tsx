"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/images/IMG_1471.jpg",
  "/images/IMG_1474.jpg",
  "/images/IMG_1476.jpg",
  "/images/IMG_1478.jpg",
  "/images/IMG_1480.jpg",
  "/images/IMG_1481.jpg",
  "/images/IMG_1482.jpg",
  "/images/IMG_1486.jpg",
] as const;

/** Time each image stays on screen. */
const FRAME_MS = 1200;

export function SpeedGallery() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink/5 md:aspect-[3/4]">
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={i === 0}
          className={`object-cover object-center transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
