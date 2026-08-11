/**
 * FontAwesome (free, solid) icon class for a table category — the single source
 * of truth replacing the old per-file `CAT_EMOJI` / `emojiFor` maps.
 * Use as: <i className={`fa-solid ${categoryIcon(t.category)}`} />
 */
const CAT_ICON: Record<string, string> = {
  'deep talks': 'fa-comments',
  'coffee & chill': 'fa-mug-hot',
  networking: 'fa-handshake',
  books: 'fa-book',
  startups: 'fa-rocket',
  'language exchange': 'fa-language',
  'board games': 'fa-chess',
};

/** Split a (possibly comma-separated multi-) category string into trimmed parts. */
export function splitCategories(category?: string | null): string[] {
  return (category ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * FA icon class for a category (case-insensitive); uses the FIRST category when
 * a table has multiple (comma-separated). Falls back to a coffee cup.
 */
export function categoryIcon(category?: string | null): string {
  const first = splitCategories(category)[0] ?? '';
  return CAT_ICON[first.toLowerCase()] ?? 'fa-mug-saucer';
}
