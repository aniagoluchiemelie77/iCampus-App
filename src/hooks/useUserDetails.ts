import { useState, useEffect, useCallback, useRef } from 'react';
import {db} from './useSQLiteDb';
import { useAppSelector } from '../hooks/hooks';
import {searchUsers, searchUsersByUid} from '../api/localGetApis';

export const useUser = (
  uid?: string,
) => {
  const currentUser = useAppSelector(state => state.user) || {};
  const [user, setUser] = useState<{
    uid: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    organizationName?: string;
    tier: "free" | "pro" | "premium";
    isVerified: boolean;
    usertype: string;
    profilePic?: string[];
  } | null>(null);
  const userTier = currentUser?.tier ?? 'free';
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!uid) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = db.execute(`SELECT * FROM users WHERE uid = ?;`, [uid]);
      const rows = result.rows;
      const rawUsers = Array.isArray(rows) 
        ? rows 
        : (rows && '_array' in rows ? rows._array : []);
      
      const rawUser = rawUsers[0];

      if (rawUser) {
        const parsedUser = {
          ...rawUser,
          profilePic: rawUser.profilePic ? JSON.parse(rawUser.profilePic) : [],
          tier: (rawUser.tier as "free" | "pro" | "premium") || 'free',
          isVerified: Boolean(rawUser.isVerified),
        };
        setUser(parsedUser);
        setLoading(false);
        return; 
      }
      const apiData = await searchUsersByUid(uid, userTier, 'user');

      if (apiData && apiData.length > 0) {
        const remoteUser = apiData[0];
        try {
          db.execute(
            `INSERT OR REPLACE INTO users (uid, firstname, lastname, username, organizationName, tier, isVerified, usertype, profilePic) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              remoteUser.uid || uid,
              remoteUser.firstname || null,
              remoteUser.lastname || null,
              remoteUser.username || null,
              remoteUser.organizationName || null,
              remoteUser.tier || 'free',
              remoteUser.isVerified ? 1 : 0,
              remoteUser.usertype || 'user',
              JSON.stringify(remoteUser.profilePic || []),
            ]
          );
        } catch (dbError) {
          console.error('Failed to cache fallback user to SQLite:', dbError);
        }

        setUser({
          uid: remoteUser.uid || uid,
          firstname: remoteUser.firstname,
          lastname: remoteUser.lastname,
          username: remoteUser.username,
          organizationName: remoteUser.organizationName,
          tier: (remoteUser.tier as "free" | "pro" | "premium") || 'free',
          isVerified: Boolean(remoteUser.isVerified),
          usertype: remoteUser.usertype || 'user',
          profilePic: remoteUser.profilePic || [],
        });
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      setError(err?.message || 'Failed to load user details');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [uid, currentUser.tier]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refreshUser: fetchUser,
  };
};
export const fetchUserWithOfflineFallback = async (
  uid: string,
) => {
  try {
    const currentUser = useAppSelector(state => state.user) || {};
    const userTier = currentUser?.tier ?? 'free';
    const result = db.execute(`SELECT * FROM users WHERE uid = ?;`, [uid]);
    const rows = result.rows;
    const rawUsers = Array.isArray(rows) ? rows : (rows && '_array' in rows ? rows._array : []);
    const rawUser = rawUsers[0];

    if (rawUser) {
      return {
        ...rawUser,
        profilePic: rawUser.profilePic ? JSON.parse(rawUser.profilePic) : [],
        tier: (rawUser.tier as "free" | "pro" | "premium") || 'free',
        isVerified: Boolean(rawUser.isVerified),
      };
    }
    const apiData = await searchUsersByUid(uid, userTier, 'user');
    if (apiData && apiData.length > 0) {
      const remoteUser = apiData[0];
      try {
        db.execute(
          `INSERT OR REPLACE INTO users (uid, firstname, lastname, username, organizationName, tier, isVerified, usertype, profilePic) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            remoteUser.uid || uid,
            remoteUser.firstname || null,
            remoteUser.lastname || null,
            remoteUser.username || null,
            remoteUser.organizationName || null,
            remoteUser.tier || 'free',
            remoteUser.isVerified ? 1 : 0,
            remoteUser.usertype || 'user',
            JSON.stringify(remoteUser.profilePic || []),
          ]
        );
      } catch (dbErr) {
        console.error('Failed to cache user to SQLite:', dbErr);
      }

      return {
        uid: remoteUser.uid || uid,
        firstname: remoteUser.firstname,
        lastname: remoteUser.lastname,
        username: remoteUser.username,
        organizationName: remoteUser.organizationName,
        tier: remoteUser.tier || 'free',
        isVerified: Boolean(remoteUser.isVerified),
        usertype: remoteUser.usertype || 'user',
        profilePic: remoteUser.profilePic || [],
      };
    }
  } catch (error) {
    console.error(`Failed to fetch user details for ${uid}:`, error);
  }
  return null;
};

const parseCachedUser = (rawUser: any) => {
  let profilePic: string[] = [];
  try {
    if (rawUser.profilePic) {
      profilePic =
        typeof rawUser.profilePic === 'string'
          ? JSON.parse(rawUser.profilePic)
          : rawUser.profilePic;
    }
  } catch (parseError) {
    profilePic = [];
  }

  return {
    ...rawUser,
    profilePic: Array.isArray(profilePic) ? profilePic : [],
    tier: (rawUser.tier as 'free' | 'pro' | 'premium') || 'free',
    isVerified: Boolean(rawUser.isVerified),
  };
};

export const searchUsersWithOfflineFallback = async (
  keyword: string,
  viewerTier: string,
  viewerRole: string,
  signal?: AbortSignal,
): Promise<any[]> => {
  const query = keyword.trim();
  let localUsers: any[] = [];

  try {
    const likeParam = `%${query}%`;
    const result = db.execute(
      `SELECT * FROM users 
       WHERE username LIKE ? OR firstname LIKE ? OR lastname LIKE ? OR organizationName LIKE ? 
       LIMIT 20;`,
      [likeParam, likeParam, likeParam, likeParam],
    );
    const rows = result.rows;
    const rawUsers = Array.isArray(rows)
      ? rows
      : rows && '_array' in rows
        ? rows._array
        : [];
    localUsers = rawUsers.map(parseCachedUser);
  } catch (dbError) {
    console.error('Failed to search local user cache:', dbError);
  }

  // The remote search endpoint requires at least 2 characters.
  if (query.length < 2) {
    return localUsers;
  }

  const remoteUsers = await searchUsers({
    q: query,
    viewerTier,
    viewerRole,
    signal,
  });

  // Remote failed or was cancelled — degrade to whatever we have cached locally.
  if (!Array.isArray(remoteUsers)) {
    return localUsers;
  }

  for (const remoteUser of remoteUsers) {
    if (!remoteUser?.uid) continue;

    try {
      db.execute(
        `INSERT OR REPLACE INTO users (uid, firstname, lastname, username, organizationName, tier, isVerified, usertype, profilePic) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          remoteUser.uid,
          remoteUser.firstname || null,
          remoteUser.lastname || null,
          remoteUser.username || null,
          remoteUser.organizationName || null,
          remoteUser.tier || 'free',
          remoteUser.isVerified ? 1 : 0,
          remoteUser.usertype || 'user',
          JSON.stringify(remoteUser.profilePic || []),
        ],
      );
    } catch (dbError) {
      console.error('Failed to cache searched user to SQLite:', dbError);
    }
  }

  const seenUids = new Set<string>(
    remoteUsers.map((user: any) => user?.uid).filter(Boolean),
  );
  const localOnlyMatches = localUsers.filter(
    user => user.uid && !seenUids.has(user.uid),
  );

  return [...remoteUsers, ...localOnlyMatches];
};

export const useUserSearch = () => {
  const currentUser = useAppSelector(state => state.user) || {};
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (keyword: string) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      try {
        const data = await searchUsersWithOfflineFallback(
          keyword,
          currentUser?.tier ?? 'free',
          currentUser?.usertype ?? 'student',
          controller.signal,
        );

        if (controller.signal.aborted) return;
        setResults(data);
      } catch (err: any) {
        console.error('Failed to search users:', err);
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [currentUser?.tier, currentUser?.usertype],
  );

  const clearResults = useCallback(() => {
    abortControllerRef.current?.abort();
    setResults([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return {
    results,
    loading,
    searchUsers: search,
    clearResults,
  };
};