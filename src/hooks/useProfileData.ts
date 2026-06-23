// src/modules/profile/hooks/useProfileData.ts
import { useState, useEffect, useCallback } from 'react';
import { searchUserProfile } from '../api/localGetApis.ts';
import Toast from 'react-native-toast-message'; 
import { 
    toggleBlockUser, 
    toggleFollowUser 
} from '../api/localPostApis.ts';
import { useDispatch } from 'react-redux';
import { updateBlockedUsers } from '../context/UserSlice.ts';

export const useProfileData = (identifier: string, currentUser: any) => {
    const dispatch = useDispatch();
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockedUserUid, setBlockedUserUid] = useState<string | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(profileData?.isFollowing || false);

  
  useEffect(() => {
    if (profileData) {
      setIsFollowing(profileData.isFollowing);
    }
  }, [profileData]);
  const handleFollowToggle = async () => {
    const previousState = isFollowing;
    setIsFollowing(!previousState);

    try {
      const result = await toggleFollowUser(profileData.uid);
      if (!result.success) {
        Toast.show({
        type: 'error',
        text2: 'Update failed',
      });
      }
      
      Toast.show({
        type: 'success',
        text1: result.action === 'followed' ? 'Success!' : 'Updated',
        text2: result.action === 'followed' 
          ? `You are now following ${profileData.firstname}` 
          : `Unfollowed ${profileData.firstname}`,
      });
    } catch (error) {
      setIsFollowing(previousState); // Revert on failure
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Could not update follow status.',
      });
    }
  };
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await searchUserProfile(identifier, currentUser);
      setProfileData(data);
      setIsBlocked(false);
    } catch (error: any) {
      if (error.response?.status === 403 || error.isBlocked) {
        setIsBlocked(true);
        setBlockedUserUid(error.response.data.targetUid);
      }
    } finally {
      setIsLoading(false);
    }
  }, [identifier, currentUser]);
  const updateLocalProfile = (updater: (prev: any) => any) => {
    setProfileData(updater);
  };
    const handleBlockToggle = async () => {
      const targetUid = profileData?.uid || blockedUserUid;
      if (!targetUid) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'User ID not found' });
        return;
      }
      const result = await toggleBlockUser(targetUid);
      if (result.success && result.action) {
        dispatch(
          updateBlockedUsers({
            targetUid,
            action: result.action,
          }),
        );
        if (result.action === 'unblocked') {
          setIsBlocked(false);
          setBlockedUserUid(null);
          fetchProfile();
        } else {
          setIsBlocked(true);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Toggle Failed',
          text2: 'Could not update block status. Please try again.',
        });
      }
    };

  return { 
    isFollowing, 
    handleFollowToggle, 
    setIsFollowing, 
    profileData, 
    isLoading, 
    isBlocked, 
    blockedUserUid, 
    setBlockedUserUid,
    fetchProfile, 
    updateLocalProfile,
    setIsBlocked,
    handleBlockToggle
 };
};