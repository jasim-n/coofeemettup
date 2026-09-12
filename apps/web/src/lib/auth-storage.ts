/** localStorage / sessionStorage key for the persisted bearer token. */
export const TOKEN_KEY = 'jrst_token';

const REMEMBER_KEY = 'jrst_remember_me';
const SAVED_EMAIL_KEY = 'jrst_saved_email';

/** Default true — most users expect to stay signed in on personal devices. */
export function getRememberMePreference(): boolean {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(REMEMBER_KEY) !== 'false';
}

export function setRememberMePreference(remember: boolean): void {
  window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

export function loadStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ??
    window.sessionStorage.getItem(TOKEN_KEY)
  );
}

export function hasStoredAuthToken(): boolean {
  return !!loadStoredAuthToken();
}

export function persistAuthToken(token: string, remember: boolean): void {
  clearAuthToken();
  setRememberMePreference(remember);
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function saveLoginEmail(email: string): void {
  window.localStorage.setItem(SAVED_EMAIL_KEY, email);
}

export function loadSavedLoginEmail(): string | null {
  if (!getRememberMePreference()) return null;
  return window.localStorage.getItem(SAVED_EMAIL_KEY);
}

export function clearSavedLoginEmail(): void {
  window.localStorage.removeItem(SAVED_EMAIL_KEY);
}
