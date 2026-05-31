import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';
import { UserIdentity } from '../components/UserIdentity';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import {
  toggleFollowUser,
  toggleBlockUserFromProfile,
} from '../api/localPostApis';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from 'context/ThemeContext';
import { UserAvatar } from './UserAvatar.tsx';

interface FollowModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  navigation: any;
}
interface UserRowProps {
  item: any;
  navigation: any;
  type: 'followers' | 'following';
}
const UserRow = ({ item, navigation, type }: UserRowProps) => {
  const [isActiveState, setIsActiveState] = useState(
    type === 'following' ? item.isFollowingByViewer ?? true : true,
  );
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    if (type === 'following') {
      const result = await toggleFollowUser(item.uid);
      if (result.success) {
        setIsActiveState(result.action === 'followed');
        Toast.show({
          type: 'success',
          text1: result.action === 'followed' ? 'Followed' : 'Unfollowed',
          text2: result.message,
        });
      }
    } else {
      const result = await toggleBlockUserFromProfile(item.uid);
      if (result.success) {
        setIsActiveState(result.action !== 'blocked');
        Toast.show({
          type: 'success',
          text1:
            result.action === 'blocked' ? 'User Blocked' : 'User Unblocked',
          text2:
            result.action === 'blocked'
              ? 'Removed from your followers list.'
              : 'Reversed successfully.',
        });
      }
    }
    setLoading(false);
  };
  const getButtonLabel = () => {
    if (loading) return <ActivityIndicator size="small" color="#fff" />;
    if (type === 'following') {
      return isActiveState ? 'Unfollow' : 'Follow';
    } else {
      return isActiveState ? 'Block' : 'Blocked';
    }
  };

  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => navigation.push('Profile', { uid: item.uid })}
    >
      <UserAvatar
        profilePic={item.profilePic}
        firstName={item.firstname}
        lastName={item.lastname}
        organizationName={item.organizationName}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <UserIdentity
          firstname={item.firstname}
          lastname={item.lastname}
          username={item.firstname}
          tier={item.tier}
          size="small"
          isOrganization={item.usertype === 'enterprise'}
          organizationName={item.organizationName}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.miniButton,
          type === 'following'
            ? isActiveState
              ? styles.buttonUnfollow
              : styles.buttonFollow
            : isActiveState
            ? styles.buttonBlock
            : styles.buttonBlocked,
        ]}
        onPress={handleToggle}
        disabled={loading || (!isActiveState && type === 'followers')}
      >
        <Text
          style={[
            styles.miniButtonText,
            type === 'following'
              ? isActiveState
                ? styles.textUnfollow
                : styles.textFollow
              : isActiveState
              ? styles.textBlock
              : styles.textBlocked,
          ]}
        >
          {getButtonLabel()}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
export const FollowersListModal: React.FC<FollowModalProps> = ({
  visible,
  onClose,
  title,
  data,
  navigation,
}) => {
  const { colors } = useTheme();
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={item => item.uid || item._id}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <UserRow item={item} navigation={navigation} type="followers" />
            )}
            ListEmptyComponent={
              <EmptyState
                iconName={'account-plus-outline'}
                title={`No ${title} Yet`}
                subtitle={"When people follow you, they'll show up here."}
                style={{ marginTop: 60 }}
              />
            }
          />
        </View>
      </View>
    </Modal>
  );
};
export const FollowingListModal: React.FC<FollowModalProps> = ({
  visible,
  onClose,
  title,
  data,
  navigation,
}) => {
  const { colors } = useTheme();
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={data}
            keyExtractor={item => item.uid || item._id}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <UserRow item={item} navigation={navigation} type="following" />
            )}
            ListEmptyComponent={
              <EmptyState
                iconName={'account-search-outline'}
                title={`No ${title} Yet`}
                subtitle={'Start following people to see them in this list.'}
                style={{ marginTop: 60 }}
              />
            }
          />
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    minHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  miniButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniButton: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.8,
    alignItems: 'center',
  },
  buttonFollow: {
    backgroundColor: 'inherit',
    borderColor: 'transparent',
  },
  buttonBlock: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  buttonUnfollow: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  buttonBlocked: {
    backgroundColor: 'inherit',
    borderColor: 'transparent',
  },
  textFollow: {
    color: PRIMARY_COLOR,
  },
  textBlock: {
    color: '#fff',
  },
  textUnfollow: {
    color: '#fff',
  },
  textBlocked: {
    color: PRIMARY_COLOR,
  },
  buttonFollowing: {
    backgroundColor: 'inherit',
  },
  textFollowing: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});