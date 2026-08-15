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

  function close() {
    setOpen(false);
  }

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
          onClick={close}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <button
            type="button"
            className="absolute top-[max(1.25rem,env(safe-area-inset-top))] right-[max(1.25rem,env(safe-area-inset-right))] z-[120] rounded-full border border-white/30 bg-ink/50 px-3 py-1.5 text-sm text-white"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            Close
          </button>
          {/* Size to the visible image so letterbox / backdrop clicks close */}
          <div
            className="relative z-[110] max-h-[min(90vh,900px)] max-w-[min(92vw,900px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1600}
              sizes="92vw"
              className="h-auto max-h-[min(90vh,900px)] w-auto max-w-[min(92vw,900px)] object-contain"
              priority
            />
          </div>
        </div>
      )}
    </>
  );
}
