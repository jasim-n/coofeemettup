export function Stars({
  value,
  onChange,
  size = 'text-xl',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${size} leading-none transition-colors ${
            n <= value ? 'text-amber-500' : 'text-muted-foreground/30'
          } ${onChange ? 'cursor-pointer hover:text-amber-500' : ''}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
