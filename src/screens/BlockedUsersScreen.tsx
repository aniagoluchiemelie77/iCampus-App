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
import { getBlockedUsers } from 'api/localGetApis';
import { useAppSelector } from '@components/hooks';
import { User } from 'types/firebase';
import { toggleBlockUser } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { updateBlockedUsers } from '@components/UserSlice';
import Toast from 'react-native-toast-message';
import { UserIdentity } from '../components/UserIdentity';
import { ScrollView } from 'react-native-gesture-handler';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';

export const BlockedUsersScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedUsers = useCallback(async () => {
    setLoading(true);
    const data = await getBlockedUsers(currentUser.uid);
    setBlockedUsers(data);
    setLoading(false);
  }, [currentUser.uid]);
  const handleUnblock = async (targetId: string) => {
    const result = await toggleBlockUser(targetId);
    if (result.success && result.action) {
      if (result.action === 'unblocked') {
        dispatch(
          updateBlockedUsers({
            targetUid: targetId,
            action: result.action,
          }),
        );
        setBlockedUsers(prev => prev.filter(user => user.uid !== targetId));
        Toast.show({
          type: 'success',
          text1: 'User Unblocked',
          text2: 'You have unblocked this user.',
        });
      }
    } else {
      Toast.show({
        type: 'error',
        text1: 'Toggle Failed',
        text2: 'Could not update block status. Please try again.',
      });
    }
  };
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);
  if (loading) return <ActivityIndicator color={colors.primary} size="large" />;
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader title="Blocked Users" />
      <FlatList
        data={blockedUsers}
        keyExtractor={item => item.uid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            iconName="no-accounts"
            title="No Blocked Users"
            subtitle="You haven't blocked any users yet."
          />
        }
        renderItem={({ item }) => {
          const lastImage =
            item.profilePic && item.profilePic.length > 0
              ? item.profilePic.slice(-1)[0]
              : null;
          return (
            <View
              style={[
                styles.userRow,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={styles.userInfo}>
                <UserAvatar
                  profilePic={lastImage!}
                  firstName={item.firstname!}
                  lastName={item.lastname}
                  organizationName={item.organizationName}
                  style={styles.avatar}
                />
                <UserIdentity
                  firstname={item.firstname!}
                  lastname={item.lastname}
                  username={item.username}
                  tier={item.tier!}
                  isVerified={item.isVerified}
                  organizationName={item.organizationName}
                  size="medium"
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.unblockBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={() => handleUnblock(item.uid)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.unblockText, { color: colors.btnTextColor }]}
                >
                  Unblock
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
    paddingHorizontal: 15,
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