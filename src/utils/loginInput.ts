// Keyboards and password managers often add stray spaces (autofill, swipe
// typing). Emails are never meaningful with surrounding whitespace, so they
// are always trimmed.
export const normalizeIdentifier = (value: string) => value.trim();

/**
 * Passwords to try, in order. Signup never trimmed passwords, so one could
 * genuinely start or end with a space: try the trimmed password first (the
 * common case: an accidental space), then the exact text if they differ.
 */
export const passwordAttempts = (password: string): string[] => {
  const trimmed = password.trim();
  if (!trimmed) return [];
  return trimmed === password ? [password] : [trimmed, password];
};
