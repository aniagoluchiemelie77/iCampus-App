import { useEffect, useRef, useState } from 'react';
import { checkUsernameAvailabilityAPI } from '../api/localGetApis';

// Same rules as the server (utils/username.js) so most problems show
// instantly; the server stays the source of truth for "taken".
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// Mirrors RESERVED in the server's utils/username.js.
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'icampus', 'support', 'help', 'system', 'root',
  'moderator', 'staff', 'official', 'security', 'null', 'undefined', 'me',
  'everyone', 'here', 'iassistant', 'settings', 'notifications',
]);

export const normalizeUsername =(raw: string) =>
  raw.trim().replace(/^@+/, '').toLowerCase();

/** Lowercases and drops characters a username can't contain (while typing). */
export const sanitizeUsernameInput = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9_]/g, '');

export const localUsernameProblem = (name: string): string | null => {
  if (!name) return 'Enter a username.';
  if (name.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (name.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`;
  if (!/^[a-z]/.test(name)) return 'Start with a letter.';
  if (!/^[a-z0-9_]+$/.test(name)) return 'Use only letters, numbers and _.';
  if (/__/.test(name)) return "Two underscores in a row aren't allowed.";
  if (RESERVED_USERNAMES.has(name)) return 'That username is reserved.';
  return null;
};

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; message: string }
  | { state: 'invalid' | 'taken' | 'error'; message: string; suggestions?: string[] };

/**
 * Debounced "is this username free?" check. `idle` while the value equals
 * the current username. `setStatus` lets callers show a server rejection
 * from the save request.
 */
export const useUsernameAvailability = (typed: string, current: string) => {
  const [status, setStatus] = useState<UsernameStatus>({ state: 'idle' });
  const isMounted = useRef(true);
  const typedUsername = normalizeUsername(typed);
  const currentUsername = normalizeUsername(current);
  const changed = typedUsername !== currentUsername;

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!changed) {
      setStatus({ state: 'idle' });
      return;
    }
    const problem = localUsernameProblem(typedUsername);
    if (problem) {
      setStatus({ state: 'invalid', message: problem });
      return;
    }
    setStatus({ state: 'checking' });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailabilityAPI(typedUsername, controller.signal);
      if (controller.signal.aborted || !isMounted.current) return;
      if (!result.success) {
        setStatus({ state: 'error', message: result.message });
      } else if (result.available) {
        setStatus({ state: 'available', message: result.message });
      } else {
        setStatus({
          state: result.suggestions?.length || /taken/i.test(result.message) ? 'taken' : 'invalid',
          message: result.message,
          suggestions: result.suggestions,
        });
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typedUsername, changed]);

  // A changed username must be confirmed free before saving.
  const blocksSave =
    changed &&
    (status.state === 'checking' || status.state === 'invalid' || status.state === 'taken');

  return { status, setStatus, typedUsername, currentUsername, changed, blocksSave };
};
