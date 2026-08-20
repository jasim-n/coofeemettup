'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { FeaturedImageDto } from '@jrst/api-client';
import { CategoryPills } from '@/components/category-pills';

function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || ms <= 0) return null;
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`;
}

function CollageGrid({
  urls,
  alt,
}: {
  urls: string[];
  alt: string;
}) {
  const cells = urls.slice(0, 4);
  if (cells.length === 2) {
    return (
      <div className="grid h-full grid-cols-2 gap-0.5">
        {cells.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={u} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
        ))}
      </div>
    );
  }
  if (cells.length === 3) {
    return (
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cells[0]} alt={alt} className="row-span-2 h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cells[1]} alt={`${alt} 2`} className="h-full w-full object-cover" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cells[2]} alt={`${alt} 3`} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
      {cells.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
      ))}
    </div>
  );
}

function SlideMedia({
  slide,
  active,
}: {
  slide: FeaturedImageDto;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const heading = slide.tableTitle ?? slide.category;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || slide.kind !== 'VIDEO') return;
    if (active) {
      void v.play().catch(() => undefined);
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active, slide.kind]);

  if (slide.kind === 'VIDEO') {
    return (
      <>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={slide.url}
          poster={slide.posterUrl ?? undefined}
          muted
          playsInline
          loop
          preload="metadata"
        />
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Reel
          </span>
          {formatDuration(slide.durationMs) && (
            <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
              {formatDuration(slide.durationMs)}
            </span>
          )}
        </div>
      </>
    );
  }

  if (slide.kind === 'COLLAGE') {
    const urls = [slide.url, ...slide.collageUrls].filter(Boolean);
    return (
      <>
        <CollageGrid urls={urls} alt={heading} />
        <div className="absolute left-4 top-4 z-10">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Collage
          </span>
        </div>
      </>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={slide.url} alt={heading} className="h-full w-full object-cover" />
  );
}

/**
 * Instagram-inspired featured showcase: photos, muted autoplay reels, collages.
 */
export function FeaturedShowcase({ slides }: { slides: FeaturedImageDto[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const active = slides[idx % n];
  const dwellMs = active?.kind === 'VIDEO' ? 8000 : active?.kind === 'COLLAGE' ? 5500 : 4000;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), dwellMs);
    return () => clearInterval(t);
  }, [n, paused, dwellMs, idx]);

  if (n === 0) return null;
  const safeIdx = idx % n;

  return (
    <div
      className="group relative h-[22rem] w-full overflow-hidden rounded-3xl shadow-glow sm:h-[26rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${safeIdx * 100}%)` }}
      >
        {slides.map((slide, i) => {
          const heading = slide.tableTitle ?? slide.category;
          return (
            <Link
              key={slide.id}
              href={`/tables/${slide.tableId}`}
              className="relative block h-full w-full shrink-0 bg-black"
            >
              <SlideMedia slide={slide} active={i === safeIdx} />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                {slide.caption && (
                  <p className="mb-1 line-clamp-2 text-sm text-white/85">{slide.caption}</p>
                )}
                <p className="font-heading truncate text-xl font-bold text-white sm:text-2xl">
                  {heading}
                </p>
                <CategoryPills
                  category={slide.category}
                  variant="glass"
                  max={3}
                  pillClassName="text-white ring-white/20"
                  className="mt-2"
                />
              </div>
            </Link>
          );
        })}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIdx((i) => (i - 1 + n) % n)}
            className="absolute left-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
          >
            <i className="fa-solid fa-chevron-left text-sm" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIdx((i) => (i + 1) % n)}
            className="absolute right-3 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
          >
            <i className="fa-solid fa-chevron-right text-sm" />
          </button>
          {/* Story-style segment progress */}
          <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/35"
              >
                <span
                  key={`${safeIdx}-${i}-${dwellMs}`}
                  className={`block h-full origin-left bg-white ${
                    i < safeIdx ? 'w-full' : i > safeIdx ? 'w-0' : ''
                  }`}
                  style={
                    i === safeIdx
                      ? {
                          width: '100%',
                          animation: `carousel-progress ${dwellMs}ms linear forwards`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }
                      : undefined
                  }
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
