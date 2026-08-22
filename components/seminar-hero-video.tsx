export function SeminarHeroVideo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative aspect-[4/5] min-h-[16rem] w-full overflow-hidden bg-ink/5 ${className}`}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover object-top"
        src="/videos/Hendrix_BIO.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="Hendrik Seegers"
      />
    </div>
  );
}
