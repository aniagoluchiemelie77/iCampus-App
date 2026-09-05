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
    icon: 'poll',
    route: 'CreatePost',
    params: { type: 'poll' },
  },
  'Post Job': {
    icon: 'business-center',
    route: 'CreatePost',
    params: { type: 'job' },
  },
  'Create Event': {
    icon: 'event',
    route: 'CreatePost',
    params: { type: 'event' },
  },
  iAssistant: {
    icon: 'auto-awesome',
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
    icon: 'account-balance-wallet',
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
  'Live Chat': { icon: 'chat', route: 'Modal' },
  'Hand Wave': { icon: 'waving-hand', route: 'Socket' },

  // --- Store Page ---
  'View Favorites': {
    icon: 'favorite',
    route: 'FavoritesScreen',
    params: {},
  },
  'Sales Hub': {
    icon: 'storefront',
    route: 'SalesHub',
    params: {},
  },
  'View Cart': {
    icon: 'shopping-cart',
    route: 'CartScreen',
    params: {},
  },

  // --- Additional ---
};

export const ExpandableFAB = ({
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
  const user = useAppSelector((state: any) => state.user) || {};

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
          course: config.params?.course,
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
          if (!config) return null;
          const isRestricted =
            label === 'Create Course' && !user?.hasSubscribed;

          return (
            <TouchableOpacity
              key={index}
              style={styles.menuItemWrapper}
              onPress={() => {
                if (isRestricted) {
                  onClose();
                  navigation.navigate('SubscriptionScreen');
                } else {
                  handleAction(label);
                }
              }}
            >
              <View
                style={[
                  styles.menuLabelBubble,
                  { backgroundColor: 'rgba(28, 28, 30, 0.85)' },
                ]}
              >
                <Text style={[styles.menuLabel, { color: '#FFFFFF' }]}>
                  {label}
                </Text>
              </View>
              <View style={styles.miniFab}>
                <MaterialIcons
                  name={config.icon}
                  size={22}
                  color={colors.btnColor || PRIMARY_COLOR_TINT}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {unreadCount && unreadCount > 0 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.btnColor || PRIMARY_COLOR_TINT },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: colors.btnTextColor || '#FFFFFF' },
              ]}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.mainFabActive,
            { backgroundColor: colors.btnColor || PRIMARY_COLOR_TINT },
          ]}
          onPress={onClose}
        >
          <MaterialIcons
            name="close"
            size={28}
            color={colors.btnTextColor || '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mainFabActive: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
  },
  fabMenuContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
  },
  menuItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuLabelBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  menuLabel: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
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
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});
export default ExpandableFAB;