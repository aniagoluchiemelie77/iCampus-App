import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { PageHeader } from '../components/PageHeader';
import { getBlockedUsers } from '../api/localGetApis';
import { useAppSelector } from '@components/hooks';
import { User } from '../types/firebase';
import { toggleBlockUser } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { updateBlockedUsers } from '../context/UserSlice';
import Toast from 'react-native-toast-message';
import { UserIdentity } from '../components/UserIdentity';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';

export const BlockedUsersScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const currentUser = useAppSelector(state => state.user);

  // State Management Matrix
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Track individual user IDs currently undergoing unblock requests to prevent button mashing
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Memoized Data Sync Engine
  const fetchBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBlockedUsers(currentUser.uid);
      setBlockedUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[BLOCKED_USERS_FETCH_ERROR]', err);
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: 'Could not load your blocked users list.',
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // Command Pipe: Safe Unblock Execution
  const handleUnblock = async (targetId: string) => {
    // Race-Condition Guard: Block duplicate clicks while this request is active
    if (processingIds.includes(targetId)) return;

    setProcessingIds(prev => [...prev, targetId]);
    try {
      const result = await toggleBlockUser(targetId);

      if (result.success && result.action === 'unblocked') {
        dispatch(
          updateBlockedUsers({
            targetUid: targetId,
            action: result.action,
          }),
        );

        // Optimistically remove user from local array state matrix
        setBlockedUsers(prev => prev.filter(user => user.uid !== targetId));

        Toast.show({
          type: 'success',
          text1: 'User Unblocked',
          text2: 'You have unblocked this user successfully.',
        });
      } else {
        throw new Error(
          'Action mismatch returned from server processing pipeline.',
        );
      }
    } catch (err) {
      console.error('[UNBLOCK_ACTION_ERROR]', err);
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: 'Could not update block status. Please try again.',
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== targetId));
    }
  };
  if (loading) {
    return (
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={blockedUsers}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<PageHeader title="Blocked Users" />}
        ListEmptyComponent={
          <EmptyState
            iconName="no-accounts"
            title="No Blocked Users"
            subtitle="You haven't blocked any users yet on iCampus."
          />
        }
        renderItem={({ item }) => {
          const isUnblocking = processingIds.includes(item.uid);

          return (
            <View
              style={[
                styles.userRow,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={styles.userInfo}>
                <UserAvatar
                  profilePic={item.profilePic} // Let component manage layout array metrics
                  firstName={item.firstname || 'User'}
                  lastName={item.lastname || ''}
                  organizationName={item.organizationName}
                  style={styles.avatar}
                />
                <UserIdentity
                  firstname={item.firstname || ''}
                  lastname={item.lastname || ''}
                  username={item.username}
                  tier={item.tier || 'free'}
                  isVerified={item.isVerified || false}
                  organizationName={item.organizationName}
                  size="medium"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.unblockBtn,
                  { backgroundColor: colors.btnColor },
                  isUnblocking && { opacity: 0.5 }, // Visual indicator for processing state
                ]}
                onPress={() => handleUnblock(item.uid)}
                activeOpacity={0.7}
                disabled={isUnblocking} // Lock hardware layer interaction
              >
                {isUnblocking ? (
                  <ActivityIndicator size="small" color={colors.btnTextColor} />
                ) : (
                  <Text
                    style={[styles.unblockText, { color: colors.btnTextColor }]}
                  >
                    Unblock
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  subContainer: {
    padding: 20,
    borderRadius: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  userRow: {
    padding: 15,
    borderRadius: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userHandle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    alignSelf: 'flex-end',
  },
  unblockText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 15,
  },
});