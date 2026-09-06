import type { ImageSourcePropType } from 'react-native';

/**
 * Ported from apps/web/src/lib/cover.ts — same category → cover mapping,
 * bundled under apps/mobile/assets/covers.
 */
const COVERS: Record<string, ImageSourcePropType> = {
  'Coffee & chill': require('../../assets/covers/coffee-chill.jpg'),
  'Deep talks': require('../../assets/covers/deep-talks.jpg'),
  Networking: require('../../assets/covers/networking.jpg'),
  Books: require('../../assets/covers/books.jpg'),
  Startups: require('../../assets/covers/startups.jpg'),
  'Language exchange': require('../../assets/covers/language.jpg'),
  'Board games': require('../../assets/covers/board-games.jpg'),
};

const DEFAULT_COVER = require('../../assets/covers/default.jpg');

export function coverFor(category: string | null | undefined): ImageSourcePropType {
  const first = (category ?? '').split(',')[0]?.trim() ?? '';
  return (first && COVERS[first]) || DEFAULT_COVER;
}
