/** Teal ring spinner. Inherits color via `text-*`; size via `size-*`. */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[3px] border-current border-t-transparent ${className}`}
    />
  );
}

/** Centered page-level loader with an optional label. */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="grid flex-1 place-items-center py-24">
      <div className="text-muted-foreground flex flex-col items-center gap-3">
        <Spinner className="text-primary size-8" />
        {label && <p className="text-sm font-medium">{label}</p>}
      </div>
    </div>
  );
}
