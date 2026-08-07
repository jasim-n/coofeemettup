// Free stock café/topic cover images bundled in /public/covers, mapped by table
// category (Design System v2.0 cards show a photo cover). Falls back to default.
const COVERS: Record<string, string> = {
  'Coffee & chill': '/covers/coffee-chill.jpg',
  'Deep talks': '/covers/deep-talks.jpg',
  Networking: '/covers/networking.jpg',
  Books: '/covers/books.jpg',
  Startups: '/covers/startups.jpg',
  'Language exchange': '/covers/language.jpg',
  'Board games': '/covers/board-games.jpg',
};

export function coverFor(category: string | null | undefined): string {
  return (category && COVERS[category]) || '/covers/default.jpg';
}
