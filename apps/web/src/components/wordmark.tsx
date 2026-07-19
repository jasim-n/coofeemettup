export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-heading inline-flex items-center gap-1.5 font-extrabold tracking-tight ${className}`}
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-ember text-[0.7em] text-white shadow-soft">
        ☕
      </span>
      Coffee&nbsp;Meetups
    </span>
  );
}
