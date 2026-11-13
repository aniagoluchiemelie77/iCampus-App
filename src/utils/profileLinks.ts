/**
 * Public profile links, LinkedIn style.
 *
 * Every profile has two addresses that open the same page (the server's
 * /users/profile/search/:identifier and the `user/:identifier` route both
 * accept a uid or a username):
 *
 *   permanent  https://useicampus.io/user/<uid>       never changes
 *   custom     https://useicampus.io/user/<username>  the one people share
 *
 * The custom URL is what we show and copy. The permanent one is the fallback
 * for accounts without a username, and keeps working after a rename.
 */
export const PROFILE_HOST = 'useicampus.io';
export const PROFILE_PATH = '/user/';

export const profileUrl = (handle: string) =>
  `https://${PROFILE_HOST}${PROFILE_PATH}${encodeURIComponent(handle)}`;

/** Without the scheme, for display. */
export const profileDisplayUrl = (handle: string) => `${PROFILE_HOST}${PROFILE_PATH}${handle}`;

export interface ProfileLinks {
  /** The handle used in the shared link (username, else uid). */
  handle: string;
  /** Link to share/copy: custom URL when set, else the permanent one. */
  url: string;
  display: string;
  /** Always resolves to this account, even after a username change. */
  permanentUrl: string;
  hasCustomUrl: boolean;
}

export const getProfileLinks = (profile?: { uid?: string; username?: string } | null): ProfileLinks => {
  const uid = profile?.uid || '';
  const username = profile?.username?.trim().replace(/^@+/, '') || '';
  const handle = username || uid;
  return {
    handle,
    url: handle ? profileUrl(handle) : '',
    display: handle ? profileDisplayUrl(handle) : '',
    permanentUrl: uid ? profileUrl(uid) : '',
    hasCustomUrl: !!username,
  };
};
