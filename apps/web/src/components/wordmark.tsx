import Image from 'next/image';

type WordmarkProps = {
  className?: string;
  /** Visual size for nav vs hero */
  size?: 'sm' | 'md' | 'lg';
};

const HEIGHT = { sm: 40, md: 56, lg: 112 } as const;

/**
 * App logo — Nine Circles wordmark (`/brand/logo.png`).
 * Favicon/mark lives separately as `app/icon.png`.
 */
export function Wordmark({ className = '', size = 'md' }: WordmarkProps) {
  const h = HEIGHT[size];
  return (
    <span className={`inline-flex items-center leading-none ${className}`}>
      <Image
        src="/brand/logo.png"
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
