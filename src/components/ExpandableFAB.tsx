import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { Lecture } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks';
import { useTheme } from '../context/ThemeContext';

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
const ACTION_CONFIG: Record<
  string,
  { icon: string; route: string; params?: any; category?: string }
> = {
  // --- Social / General ---
  'Create Poll': {
    icon: 'poll-outlined',
    route: 'CreatePost',
    params: { type: 'poll' },
  },
  iAssistant: {
    icon: 'auto-awesome-outlined',
    route: 'Assistant',
    params: {
      contextType: 'general',
      contextData: { title: 'General Assistant' },
      assistantTitle: 'iAssistant',
      placeholder: 'Ask me anything...',
      initialMessage: "Hi! I'm your iAssistant. How can I help you today?",
    },
  },
  'Create Post': {
    icon: 'edit',
    route: 'CreatePost',
    params: { type: 'post' },
  },

  // --- Financial / Wallet ---
  iCash: {
    icon: 'account-balance-wallet-outlined',
    route: 'ICashDashboard',
    params: {},
  },

  // --- Classroom Page ---
  'View Lectures': {
    icon: 'menu-book-outlined',
    route: 'CourseSubPage',
    params: { title: 'View Lecture Schedule' },
  },
  'Create Course': {
    icon: 'library-books-outlined',
    route: 'CreateCourse',
    params: {},
    category: 'premium',
  },
  'Live Chat': { icon: 'chat-bubble-outline-outlined', route: 'Modal' },
  'Hand Wave': { icon: 'waving-hand-outlined', route: 'Socket' },
  Library: {
    icon: 'align-vertical-bottom-outlined',
    route: 'LibraryScreen',
    params: {},
  },

  // --- Store Page ---
  'View Favorites': {
    icon: 'favorite',
    route: 'FavoritesScreen',
    params: {},
  },
  'Sales Hub': {
    icon: 'store-front-outlined',
    route: 'SalesHub',
    params: {},
  },
  'View Cart': {
    icon: 'shopping-cart-outlined',
    route: 'CartScreen',
    params: {},
  },

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
  const { colors } = useTheme();
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
    } else if (label === 'iCash') {
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
          const isRestricted =
            label === 'Create Course' && !user?.hasSubscribed;

          return (
            <View
              key={index}
              style={[
                styles.menuItemWrapper,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={[styles.menuLabel, { color: colors.primary }]}>
                {label}
              </Text>
              <TouchableOpacity
                style={[styles.miniFab, { backgroundColor: colors.btnColor }]}
                onPress={() => {
                  if (isRestricted) {
                    onClose();
                    navigation.navigate('SubscriptionScreen');
                  } else {
                    handleAction(label);
                  }
                }}
              >
                <MaterialIcons
                  name={config.icon}
                  size={24}
                  color={colors.btnTextColor}
                />
              </TouchableOpacity>
            </View>
          );
        })}
        {unreadCount && unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.btnColor }]}>
            <Text style={[styles.badgeText, { color: colors.btnTextColor }]}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.mainFabActive, { backgroundColor: colors.btnColor }]}
          onPress={onClose}
        >
          <MaterialIcons
            name="close-outlined"
            size={30}
            color={colors.btnTextColor}
          />
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
    bottom: 20,
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
    overflow: 'hidden',
    elevation: 3,
  },
  miniFab: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});