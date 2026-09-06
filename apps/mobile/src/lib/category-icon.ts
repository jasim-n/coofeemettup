import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * Ported from apps/web/src/lib/category-icon.ts.
 * Web uses Font Awesome class names; mobile maps the same categories to Ionicons.
 */
type IonName = ComponentProps<typeof Ionicons>['name'];

const CAT_ICON: Record<string, IonName> = {
  'deep talks': 'chatbubbles',
  'coffee & chill': 'cafe',
  networking: 'people',
  books: 'book',
  startups: 'rocket',
  'language exchange': 'language',
  'board games': 'game-controller',
};

/** Split a (possibly comma-separated multi-) category string into trimmed parts. */
export function splitCategories(category?: string | null): string[] {
  return (category ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ionicons name for a category (first segment when comma-separated). */
export function categoryIcon(category?: string | null): IonName {
  const first = splitCategories(category)[0] ?? '';
  return CAT_ICON[first.toLowerCase()] ?? 'cafe';
}
