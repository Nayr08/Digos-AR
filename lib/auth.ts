export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function usernameToAuthEmail(username: string) {
  return `${normalizeUsername(username)}@digosar.local`;
}

export function friendlyAuthError(message: string, mode: 'login' | 'signup') {
  const normalized = message.toLowerCase();
  if (mode === 'login') return 'Invalid username or password.';
  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('email rate limit')
  ) {
    return 'Too many signup attempts. Please wait a minute and try again. If this continues, the administrator must disable Confirm Email in Supabase.';
  }
  if (normalized.includes('already') || normalized.includes('duplicate') || normalized.includes('unique') || normalized.includes('database error')) {
    return 'That username is already taken.';
  }
  if (normalized.includes('password')) return 'Password must contain at least 6 characters.';
  return 'Unable to create account. Please try again.';
}
