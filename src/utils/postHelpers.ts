import moment from 'moment';
import { safeParseDate } from './dateFormatter';

/**
 * Posts reach the app from the feed, search, profiles and notifications, which
 * don't all expose the same id field, so resolve it defensively.
 */
export const getPostId = (post: any): string =>
  post?.postId || post?.id || post?._id || '';

export const toArray = <T = any>(value: any): T[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/** Last entry of a profilePic field (string or array). */
export const lastProfilePic = (profilePic: any): string | undefined => {
  const urls = toArray(profilePic);
  const uri = urls[urls.length - 1];
  return typeof uri === 'string' && uri ? uri : undefined;
};

/**
 * Firestore dates reach the app as Timestamps, `{ _seconds }` / `{ seconds }`
 * objects or ISO strings. Returns null (not "now") for a missing/invalid value.
 */
export const toMoment = (value: any): moment.Moment | null => {
  const date = safeParseDate(value);
  if (!date) return null;
  const m = moment(date);
  return m.isValid() ? m : null;
};

/** "now", "5m", "3h", "4d", then "Oct 3", or "Oct 3, 2025" for older years. */
export const compactRelativeTime = (value: any): string => {
  const m = toMoment(value);
  if (!m) return '';
  const now = moment();
  const seconds = now.diff(m, 'seconds');
  if (seconds < 45) return 'now';
  const minutes = now.diff(m, 'minutes');
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = now.diff(m, 'hours');
  if (hours < 24) return `${hours}h`;
  const days = now.diff(m, 'days');
  if (days < 7) return `${days}d`;
  return m.format(m.isSame(now, 'year') ? 'MMM D' : 'MMM D, YYYY');
};

/** Full timestamp for accessibility labels, e.g. "Oct 21, 2026 at 7:34 PM". */
export const fullTimestamp = (value: any): string => {
  const m = toMoment(value);
  return m ? m.format('MMM D, YYYY [at] h:mm A') : '';
};

/** Poll state derived from its (Firestore) `expiresAt`. */
export const pollTiming = (poll: any): { ended: boolean; label: string } => {
  const expires = toMoment(poll?.expiresAt);
  if (!expires) return { ended: false, label: '' };
  if (!expires.isAfter(moment())) {
    return { ended: true, label: `Ended ${expires.fromNow()}` };
  }
  return { ended: false, label: `Ends ${expires.fromNow()}` };
};

export const displayName = (person: any): string => {
  if (!person) return '';
  if (person.organizationName) return person.organizationName;
  return `${person.firstname || ''} ${person.lastname || ''}`.trim() || person.username || '';
};

/**
 * React Navigation refuses class instances, functions and cycles in route
 * params; send a plain-data snapshot (the screen refetches anyway).
 */
export const toNavigablePost = <T>(post: T): T | undefined => {
  try {
    return JSON.parse(JSON.stringify(post));
  } catch {
    return undefined;
  }
};
