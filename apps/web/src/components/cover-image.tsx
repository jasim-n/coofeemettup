import { coverFor } from '@/lib/cover';

/** Photo cover for tables (Design System v2.0 cards). Pass a category or an explicit src. */
export function Cover({
  category,
  src,
  className = '',
}: {
  category?: string | null;
  src?: string;
  className?: string;
}) {
  // eslint-disable-next-line @next/next/no-img-element -- bundled local /covers assets; next/image optimization not needed
  return <img src={src ?? coverFor(category)} alt="" loading="lazy" className={className} />;
}
