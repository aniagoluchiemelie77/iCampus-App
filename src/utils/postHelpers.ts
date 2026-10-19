import { formatDistanceToNowStrict } from 'date-fns';
import { parseFirestoreDate } from './dateFormatter';

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

/** "now", "5m", "3h", "2d", "4mo", "1y". */
export const compactRelativeTime = (value: any): string => {
  // parseFirestoreDate treats a missing value as "now"; an undated post
  // should show no time instead.
  if (!value) return '';
  const date = parseFirestoreDate(value);
  if (!date || isNaN(date.getTime())) return '';
  if (Date.now() - date.getTime() < 45 * 1000) return 'now';
  try {
    return formatDistanceToNowStrict(date, { addSuffix: false })
      .replace(/ seconds?/g, 's')
      .replace(/ minutes?/g, 'm')
      .replace(/ hours?/g, 'h')
      .replace(/ days?/g, 'd')
      .replace(/ months?/g, 'mo')
      .replace(/ years?/g, 'y');
  } catch {
    return '';
  }
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
