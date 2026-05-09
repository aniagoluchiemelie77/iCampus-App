import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR } from './Classroomcomponent';
import { Lecture } from 'types/firebase';
import { useAppSelector } from './hooks';

interface FABProps {
  isVisible: boolean;
  onClose: () => void;
  actions: string[];
  userRole?: string;
  lectures?: Lecture[];
  unreadCount?: number;
  onChatOpen?: () => void;
  onWave?: () => void;
}
// 1. Define the configuration mapping
const ACTION_CONFIG: Record<
  string,
  { icon: string; route: string; params?: any; category?: string }
> = {
  // --- Social / General ---
  'Create Poll': {
    icon: 'poll', // MaterialIcons uses 'poll' (outlined by default or 'assessment')
    route: 'CreatePost',
    params: { type: 'poll' },
  },
  iAssistant: {
    icon: 'assistant', // For outlined, ensure your library supports it or use 'robot-outline' if using MaterialCommunityIcons
    route: 'Assistant',
    params: {
      contextType: 'general',
      contextData: {},
      initialMessage: "Hi! I'm your iAssistant. How can I help you today?",
    },
  },
  'Create Post': {
    icon: 'edit', // 'edit-note' looks more like an outlined 'edit'
    route: 'CreatePost',
    params: { type: 'post' },
  },

  // --- Financial / Wallet ---
  iCash: {
    icon: 'account-balance',
    route: 'ICashDashboard',
    params: {},
  },

  // --- Classroom Page ---
  'View Lectures': {
    icon: 'menu-book',
    route: 'CourseSubPage',
    params: { title: 'View Lecture Schedule' },
  },
  'Create Course': {
    icon: 'library-books',
    route: 'CreateCourse',
    params: {},
    category: 'premium',
  },
  'Live Chat': { icon: 'chat', route: 'Modal' }, // Explicitly outlined
  'Hand Wave': { icon: 'waving-hand', route: 'Socket' },
  Library: {
    icon: 'align-vertical-bottom',
    route: 'LibraryScreen',
    params: {},
  },

  // --- Store Page ---
  'View Favorites': {
    icon: 'favorite',
    route: 'StoreWishlist',
    params: {},
  }, // 'favorite-border' is the outline
  'View Cart': { icon: 'shopping-cart', route: 'CartScreen', params: {} },

  // --- Additional ---
};

const ExpandableFAB = ({
  isVisible,
  onClose,
  actions,
  userRole,
  lectures,
  unreadCount,
  onChatOpen,
  onWave,
}: FABProps) => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.user);
  if (!isVisible) return null;
  const handleAction = (label: string) => {
    const config = ACTION_CONFIG[label];
    if (!config) return;
    if (label === 'Create Course' && !user?.hasSubscribed) {
      onClose();
      navigation.navigate('SubscriptionScreen');
      return;
    } else if (label === 'Live Chat') {
      onChatOpen?.();
      onClose();
      return;
    } else if (label === 'Hand Wave') {
      onWave?.();
    } else if (label === 'iAssistant') {
      navigation.navigate('Assistant', {
        contextType: lectures && lectures.length > 0 ? 'lecture' : 'general',
        contextData: {
          lectures: lectures,
          course: config.params?.course, // Passed from parent if available
          topicName: lectures?.[0]?.topicName || 'General Support',
        },
        initialMessage:
          lectures && lectures.length > 0
            ? `I see you're looking at lectures for ${lectures[0].topicName}. How can I help?`
            : undefined,
      });
      return;
    }else if (label === 'iCash') {
      navigation.navigate('ICashDashboard', {
        refresh: true,
      });
      return;
    }
    onClose();
    if (config.route) {
      navigation.navigate(config.route, {
        ...config.params,
        lectures,
        userRole,
      });
    }
  };
  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="dark"
        blurAmount={10}
      />
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.fabMenuContainer}>
        {actions.map((label: string, index: number) => {
          const config = ACTION_CONFIG[label];

          // Logic: If user is not 'lecturer' (unsubscribed/student), show a lock or redirect
          const isRestricted =
            label === 'Create Course' && !user?.hasSubscribed;

          return (
            <View key={index} style={styles.menuItemWrapper}>
              <Text style={styles.menuLabel}>{label}</Text>
              <TouchableOpacity
                style={styles.miniFab}
                onPress={() => {
                  if (isRestricted) {
                    onClose();
                    navigation.navigate('SubscriptionScreen'); // Redirect to upgrade
                  } else {
                    handleAction(label);
                  }
                }}
              >
                <MaterialIcons name={config.icon} size={24} color={'#fff'} />
              </TouchableOpacity>
            </View>
          );
        })}
        {unreadCount && unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.mainFabActive} onPress={onClose}>
          <MaterialIcons name="close" size={30} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default ExpandableFAB;

const styles = StyleSheet.create({
  mainFabActive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    marginTop: 10,
  },
  overlay: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19, 18, 18, 0.4)',
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
  },
  menuItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  menuLabel: {
    fontWeight: '700',
    marginRight: 15,
    fontSize: 15,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
  },
  miniFab: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    zIndex: 10,
  },
  badgeText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});