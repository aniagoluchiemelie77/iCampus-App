import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { baseUrl } from '../components/HomeScreenComponents';
import {
  PRIMARY_COLOR,
} from '@components/Classroomcomponent';
import { UserIdentity } from '../components/UserIdentity';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { EmptyState } from '../components/EmptyFlatlistComponent';

interface FollowModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  navigation: any;
}

const UserRow = ({ item, navigation }: { item: any; navigation: any }) => {
  const currentUser = useAppSelector(state => state.user);
  const [isFollowing, setIsFollowing] = useState(
    item.isFollowingByViewer || false,
  );
  const [loading, setLoading] = useState(false);
  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${baseUrl}users/follow/toggle`, {
        followerId: currentUser.uid,
        followingId: item.uid,
      });
      if (response.data.success) {
        setIsFollowing(!isFollowing);
        Toast.show({
          type: 'success',
          text1: response.data.action === 'followed' ? 'Success' : 'Updated',
          text2: response.data.message,
        });
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => {
        navigation.push('Profile', { uid: item.uid });
      }}
    >
      <Image source={{ uri: item.profilePic?.[0] }} style={styles.avatar} />
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
          isFollowing ? styles.buttonFollowing : styles.buttonFollow,
        ]}
        onPress={handleToggle}
        disabled={loading}
      >
        <Text
          style={[
            styles.miniButtonText,
            isFollowing ? styles.textFollowing : styles.textFollow,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isFollowing ? (
            'Following'
          ) : (
            'Follow'
          )}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
export const FollowListModal: React.FC<FollowModalProps> = ({
  visible,
  onClose,
  title,
  data,
  navigation,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close"
                size={24}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={item => item.uid || item._id}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <UserRow item={item} navigation={navigation} />
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
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close"
                size={24}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
          </View>

          {/* List */}
          <FlatList
            data={data}
            keyExtractor={item => item.uid || item._id}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <UserRow item={item} navigation={navigation} />
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
    backgroundColor: '#fff',
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
    color: '#222',
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
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  miniButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniButton: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.8,
    alignItems: 'center',
  },
  // State: Follow Back (Primary)
  buttonFollow: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  textFollow: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // State: Already Following (Outline)
  buttonFollowing: {
    backgroundColor: 'inherit',
  },
  textFollowing: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
});