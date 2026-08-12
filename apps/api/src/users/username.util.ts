/**
 * Public @handle rules — the single source of truth used at signup, profile
 * edit, and the availability check. Lowercase letters, digits, underscore;
 * 3–20 chars. Stored/compared lowercase.
 */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

/** Returns the normalized handle if valid, else throws with a friendly message. */
export function validateUsername(raw: string): string {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) {
    throw new Error(
      'Handle must be 3–20 characters: lowercase letters, numbers or underscores.',
    );
  }
  return u;
}
