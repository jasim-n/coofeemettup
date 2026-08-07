// Reliable avatar: initials in a deterministic colored circle (no external image
// service). Optional `src` for future real photos; optional online dot.
const PALETTES = [
  'bg-primary/15 text-primary',
  'bg-[oklch(0.62_0.21_259/_0.15)] text-[oklch(0.5_0.21_259)]', // info
  'bg-[oklch(0.61_0.22_292/_0.15)] text-[oklch(0.5_0.22_292)]', // purple
  'bg-[oklch(0.65_0.2_354/_0.15)] text-[oklch(0.52_0.2_354)]', // pink
  'bg-[oklch(0.8_0.14_75/_0.2)] text-[oklch(0.52_0.14_70)]', // amber
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p.charAt(0)).join('').toUpperCase() || '?';
}

function paletteFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length]!;
}

export function Avatar({
  name,
  src,
  size = 40,
  online,
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const label = name || '?';
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar thumbnail, no next/image optimization needed
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className={`font-heading grid h-full w-full place-items-center rounded-full font-bold ${paletteFor(label)}`}
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          {initialsOf(label)}
        </span>
      )}
      {online && (
        <span className="bg-primary ring-card absolute right-0 bottom-0 block size-[28%] rounded-full ring-2" />
      )}
    </span>
  );
}
