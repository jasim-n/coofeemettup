/** Teal ring spinner — for small inline fetches (not page-level). */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[3px] border-current border-t-transparent ${className}`}
    />
  );
}

/** Full-page counter loader — auth boot only (via LoadingGate in AuthGate). */
export { PageLoader } from '@/components/page-loader';
export { LoadingGate } from '@/components/loading-gate';
export { ContentPlaceholder } from '@/components/content-placeholder';
