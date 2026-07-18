export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-heading font-extrabold tracking-tight ${className}`}>
      ☕ Coffee Meetups
    </span>
  );
}
