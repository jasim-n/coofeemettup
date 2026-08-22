'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import type { FeaturedImageDto, MediaLayout } from '@jrst/api-client';
import { CategoryPills } from '@/components/category-pills';
import { mediaFrameStyle, resolveCollageGrid } from '@/lib/media-layout';

function formatDuration(ms: number | null | undefined): string | null {
  if (ms == null || ms <= 0) return null;
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function centeredFrameStyle(layout: MediaLayout | null | undefined): CSSProperties {
  const frame = mediaFrameStyle(layout);
  return {
    objectFit: frame.objectFit,
    objectPosition: frame.objectPosition,
    width: '100%',
    height: '100%',
    transformOrigin: 'center center',
    transform:
      frame.scale === 1
        ? 'translate(-50%, -50%)'
        : `translate(-50%, -50%) scale(${frame.scale})`,
  };
}

function CollageCell({
  url,
  alt,
  active,
  layout,
}: {
  url: string;
  alt: string;
  active: boolean;
  layout: MediaLayout | null | undefined;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const style = centeredFrameStyle(layout);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) void v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  return (
    <div className="relative h-full min-h-0 min-w-0 overflow-hidden bg-black">
      {isVideoUrl(url) ? (
        <video
          ref={ref}
          src={url}
          className="absolute left-1/2 top-1/2 max-w-none"
          style={style}
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="absolute left-1/2 top-1/2 max-w-none" style={style} />
      )}
    </div>
  );
}

function CollageGrid({
  urls,
  alt,
  active,
  layout,
}: {
  urls: string[];
  alt: string;
  active: boolean;
  layout: MediaLayout | null | undefined;
}) {
  const grid = resolveCollageGrid(layout, urls.length);

  if (grid.mode === 'masonry-columns' && grid.masonryColumns) {
    // Column-major fill: L top→bot, C top→bot, R top→bot
    let cursor = 0;
    return (
      <div className="flex h-full w-full gap-0.5">
        {grid.masonryColumns.map((weights, colIdx) => (
          <div key={colIdx} className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            {weights.map((flex, rowIdx) => {
              const url = urls[cursor++];
              if (!url) {
                return (
                  <div
                    key={`${colIdx}-${rowIdx}`}
                    className="min-h-0 bg-black/40"
                    style={{ flex }}
                  />
                );
              }
              return (
                <div
                  key={`${colIdx}-${rowIdx}`}
                  className="min-h-0 min-w-0 overflow-hidden"
                  style={{ flex }}
                >
                  <CollageCell
                    url={url}
                    alt={`${alt} ${cursor}`}
                    active={active}
                    layout={layout}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid h-full w-full gap-0.5"
      style={{
        gridTemplateColumns: grid.columns,
        gridTemplateRows: grid.rows,
      }}
    >
      {urls.slice(0, grid.cells.length).map((u, i) => {
        const cell = grid.cells[i]!;
        return (
          <div
            key={i}
            className="min-h-0 min-w-0 overflow-hidden"
            style={{
              gridColumn: `${cell.col} / span ${cell.colSpan ?? 1}`,
              gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
            }}
          >
            <CollageCell url={u} alt={`${alt} ${i + 1}`} active={active} layout={layout} />
          </div>
        );
      })}
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
  const style = centeredFrameStyle(slide.layout);

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
        <div className="absolute inset-0 overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="absolute left-1/2 top-1/2 max-w-none"
            style={style}
            src={slide.url}
            poster={slide.posterUrl ?? undefined}
            muted
            playsInline
            loop
            preload="metadata"
          />
        </div>
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
        <CollageGrid urls={urls} alt={heading} active={active} layout={slide.layout} />
        <div className="absolute left-4 top-4 z-10">
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            Collage
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.url}
        alt={heading}
        className="absolute left-1/2 top-1/2 max-w-none"
        style={style}
      />
    </div>
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
      className="group relative h-[17rem] w-full overflow-hidden rounded-3xl shadow-glow sm:h-[22rem] md:h-[26rem]"
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
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6">
                {slide.caption && (
                  <p className="mb-1 line-clamp-2 text-xs text-white/85 sm:text-sm">{slide.caption}</p>
                )}
                <p className="font-heading truncate text-lg font-bold text-white sm:text-xl md:text-2xl">
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
