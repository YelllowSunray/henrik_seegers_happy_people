"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function LightboxImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full overflow-hidden bg-ink/5 text-left ${className}`}
        aria-label={`${alt} — enlarge`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 30vw"
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-[max(1.25rem,env(safe-area-inset-right))] rounded-full border border-white/30 px-3 py-1.5 text-sm text-white"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <div
            className="relative h-[min(90vh,900px)] w-[min(92vw,900px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="92vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
