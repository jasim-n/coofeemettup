import { categoryIcon, splitCategories } from '@/lib/category-icon';
import { cn } from '@/lib/utils';

type Variant = 'glass' | 'badge' | 'chip' | 'muted';

const PILL: Record<Variant, string> = {
  glass:
    'glass ring-border/40 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
  badge:
    'bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold',
  chip: 'inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold',
  muted:
    'text-muted-foreground inline-flex items-center gap-1 text-xs font-semibold',
};

/**
 * Renders each comma-separated table category as its own pill.
 * Storage stays a single `category` string; UI splits via `splitCategories`.
 */
export function CategoryPills({
  category,
  className,
  pillClassName,
  variant = 'badge',
  max,
  showIcon = true,
}: {
  category?: string | null;
  className?: string;
  pillClassName?: string;
  variant?: Variant;
  /** Cap pills in tight cards; remainder as +N */
  max?: number;
  showIcon?: boolean;
}) {
  const parts = splitCategories(category);
  if (parts.length === 0) return null;
  const shown = max != null ? parts.slice(0, max) : parts;
  const extra = max != null ? Math.max(0, parts.length - shown.length) : 0;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((c) => (
        <span key={c} className={cn(PILL[variant], pillClassName)}>
          {showIcon && <i className={`fa-solid ${categoryIcon(c)}`} />}
          {c}
        </span>
      ))}
      {extra > 0 && (
        <span className={cn(PILL[variant], pillClassName)}>+{extra}</span>
      )}
    </div>
  );
}
