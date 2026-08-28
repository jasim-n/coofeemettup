import Image from 'next/image';

type WordmarkProps = {
  className?: string;
  /** Visual size for nav vs hero */
  size?: 'sm' | 'md' | 'lg';
  /** `white` = /brand/logo-in-white.png (login / dark surfaces) */
  variant?: 'default' | 'white';
};

const HEIGHT = { sm: 40, md: 56, lg: 112 } as const;

/**
 * App logo — Nine Circles wordmark.
 * Favicon/mark lives separately as `app/icon.png`.
 */
export function Wordmark({
  className = '',
  size = 'md',
  variant = 'default',
}: WordmarkProps) {
  const h = HEIGHT[size];
  const src =
    variant === 'white' ? '/brand/logo-in-white.png' : '/brand/logo.png';
  return (
    <span className={`inline-flex items-center leading-none ${className}`}>
      <Image
        src={src}
        alt="Nine Circles"
        width={h}
        height={h}
        className="rounded-xl object-contain shadow-soft"
        style={{ height: h, width: h }}
        priority
      />
    </span>
  );
}
