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

/** FA icon class for a category (case-insensitive); falls back to a coffee cup. */
export function categoryIcon(category?: string | null): string {
  return CAT_ICON[(category ?? '').toLowerCase()] ?? 'fa-mug-saucer';
}
