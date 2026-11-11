import { useState, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { searchUserProfile } from '../api/localGetApis.ts';
import { toggleFollowUser } from '../api/localPostApis.ts';

export type ProfileStatus = 'loading' | 'ready' | 'notFound' | 'error';

export const useProfileData = (identifier: string, currentUser: any) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const viewerRef = useRef(currentUser);
  viewerRef.current = currentUser;
  const requestId = useRef(0);

  // Depends on the viewer's uid only, so unrelated Redux user updates don't
  // refetch the profile.
  const fetchProfile = useCallback(async () => {
    const id = ++requestId.current;
    setStatus(prev => (prev === 'ready' ? prev : 'loading'));
    const result = await searchUserProfile({ identifier, currentUser: viewerRef.current });
    if (id !== requestId.current) return;
    switch (result.status) {
      case 'ok':
        setProfileData(result.data);
        setIsFollowing(!!result.data?.isFollowing);
        setStatus('ready');
        break;
      case 'notFound':
        setProfileData(null);
        setStatus('notFound');
        break;
      default:
        setErrorMessage(result.message);
        setStatus(prev => (prev === 'ready' ? prev : 'error'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identifier, currentUser?.uid]);

  const updateLocalProfile = (updater: (prev: any) => any) => {
    setProfileData(updater);
  };

  const handleFollowToggle = async () => {
    if (!profileData?.uid || followBusy) return;
    const wasFollowing = isFollowing;
    const adjust = (delta: number) =>
      setProfileData((p: any) =>
        p ? { ...p, followersCount: Math.max(0, (p.followersCount || 0) + delta) } : p,
      );
    setFollowBusy(true);
    setIsFollowing(!wasFollowing);
    adjust(wasFollowing ? -1 : 1);
    try {
      const result = await toggleFollowUser(profileData.uid);
      if (!result?.success) throw new Error(result?.message);
      const nowFollowing = result.action === 'followed';
      if (nowFollowing === wasFollowing) {
        // Server disagreed with the optimistic guess; adopt its answer.
        setIsFollowing(nowFollowing);
        adjust(wasFollowing ? 1 : -1);
      }
      Toast.show({
        type: 'success',
        text2: nowFollowing
          ? `You're now following ${profileData.firstname || 'this user'}`
          : `Unfollowed ${profileData.firstname || 'this user'}`,
      });
    } catch (error: any) {
      setIsFollowing(wasFollowing);
      adjust(wasFollowing ? 1 : -1);
      Toast.show({
        type: 'error',
        text1: 'Follow failed',
        text2: error?.message || 'Could not update follow status.',
      });
    } finally {
      setFollowBusy(false);
    }
  };

  return {
    profileData,
    status,
    errorMessage,
    isFollowing,
    followBusy,
    fetchProfile,
    updateLocalProfile,
    handleFollowToggle,
  };
};
