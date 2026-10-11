import { useState, useEffect, useCallback } from 'react';
import {db} from './useSQLiteDb';

export const useUser = (uid?: string) => {
  const [user, setUser] = useState<{
    uid: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    organizationName?: string;
    tier: string;
    isVerified: boolean;
    usertype: string;
    profilePic?: string[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(() => {
    if (!uid) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = db.execute(
        `SELECT * FROM users WHERE uid = ?;`,
        [uid]
      );
      const rows = result.rows;
      const rawUsers = Array.isArray(rows) 
        ? rows 
        : (rows && '_array' in rows ? rows._array : []);
      
      const rawUser = rawUsers[0];

      if (rawUser) {
        const parsedUser = {
          ...rawUser,
          profilePic: rawUser.profilePic ? JSON.parse(rawUser.profilePic) : [],
          tier: rawUser.tier as "free" | "pro" | "premium",
        };
        setUser(parsedUser);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error('Failed to load user from SQLite:', err);
      setError(err?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [uid]);

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