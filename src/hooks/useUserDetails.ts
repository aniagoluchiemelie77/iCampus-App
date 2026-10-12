import { useState, useEffect, useCallback } from 'react';
import {db} from './useSQLiteDb';
import { useAppSelector } from '../hooks/hooks';
import {searchUsersByUid} from '../api/localGetApis';

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