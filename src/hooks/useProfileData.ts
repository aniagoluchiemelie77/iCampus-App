import { useState, useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { searchUserProfile } from '../api/localGetApis.ts';
import { toggleBlockUser, toggleFollowUser } from '../api/localPostApis.ts';
import { updateBlockedUsers } from '../context/UserSlice.ts';

export type ProfileStatus = 'loading' | 'ready' | 'blocked' | 'notFound' | 'error';

export const useProfileData = (identifier: string, currentUser: any) => {
  const dispatch = useDispatch();
  const [profileData, setProfileData] = useState<any>(null);
  const [status, setStatus] = useState<ProfileStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Who blocked whom decides whether the screen offers "Unblock".
  const [blockedByViewer, setBlockedByViewer] = useState(false);
  const [blockedUid, setBlockedUid] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const viewerRef = useRef(currentUser);
  viewerRef.current = currentUser;
  const requestId = useRef(0);

  // Depends on the viewer's uid only. It used to depend on the whole user
  // object, so blocking (which updates the user's blockedUsers in Redux)
  // re-ran the fetch: the server answered 403, an error toast appeared and
  // the screen fell back to "User not found".
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
      case 'blocked':
        setProfileData(null);
        setBlockedByViewer(result.blockedByViewer);
        setBlockedUid(result.targetUid);
        setStatus('blocked');
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

  const handleBlockToggle = async () => {
    const targetUid = profileData?.uid || blockedUid;
    if (!targetUid || blockBusy) return;
    setBlockBusy(true);
    // toggleBlockUser shows its own success / error toast.
    const result = await toggleBlockUser(targetUid);
    setBlockBusy(false);
    if (!result.success || !result.action) return;
    dispatch(updateBlockedUsers({ targetUid, action: result.action }));
    if (result.action === 'blocked') {
      setBlockedByViewer(true);
      setBlockedUid(targetUid);
      setIsFollowing(false);
      setStatus('blocked');
    } else {
      setBlockedByViewer(false);
      setBlockedUid(null);
      setStatus('loading');
      fetchProfile();
    }
  };

  return {
    profileData,
    status,
    errorMessage,
    isBlocked: status === 'blocked',
    blockedByViewer,
    isFollowing,
    followBusy,
    blockBusy,
    fetchProfile,
    updateLocalProfile,
    handleFollowToggle,
    handleBlockToggle,
  };
};
