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
import { UserIdentity } from '../components/UserIdentity';
import { PRIMARY_COLOR_TINT, PRIMARY_COLOR } from '../assets/styles/colors';
import { toggleFollowUser } from '../api/localPostApis';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
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
  const [isFollowing, setIsFollowing] = useState(
    item.isFollowingByViewer ?? true,
  );
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const result = await toggleFollowUser(item.uid);
    if (result.success) {
      setIsFollowing(result.action === 'followed');
      Toast.show({
        type: 'success',
        text1: result.action === 'followed' ? 'Followed' : 'Unfollowed',
        text2: result.message,
      });
    }
    setLoading(false);
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

      {type === 'following' && (
        <TouchableOpacity
          style={[
            styles.miniButton,
            isFollowing ? styles.buttonUnfollow : styles.buttonFollow,
          ]}
          onPress={handleToggle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.miniButtonText,
                isFollowing ? styles.textUnfollow : styles.textFollow,
              ]}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
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
  buttonUnfollow: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  textFollow: {
    color: PRIMARY_COLOR,
  },
  textUnfollow: {
    color: '#fff',
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