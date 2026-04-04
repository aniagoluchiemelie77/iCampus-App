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
  userRole?: string ;
  lectures?: Lecture[]; // Optional because not every page has a course context
}
// 1. Define the configuration mapping
const ACTION_CONFIG: Record<string, { icon: string; route: string; params: any; category?: string }> = {
  // --- Social / General ---
  'Create Poll': { icon: 'poll', route: 'CreatePost', params: { type: 'poll' } },
  'Create Post': { icon: 'edit', route: 'CreatePost', params: { type: 'post' } },

  // --- Classroom Page ---
  'View Lectures': { icon: 'menu-book', route: 'CourseSubPage', params: { title: 'View Lecture Schedule' } },
  'Create Course': { icon: 'add-business', route: 'CreateCourse', params: {}, category: 'premium' },

  // --- Store Page ---
  'View Favorites': { icon: 'favorite', route: 'StoreWishlist', params: {} },
  'View Cart': { icon: 'shopping-cart', route: 'StoreCart', params: {} },
  
  // --- Additional ---
};


const ExpandableFAB = ({ isVisible, onClose, actions, userRole, lectures }: FABProps) => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.user);

  if (!isVisible) return null;

  // Inside ExpandableFAB component
const handleAction = (label: string) => {
  const config = ACTION_CONFIG[label];
  if (!config) return;

  // 1. Check for subscription restriction
  if (label === 'Create Course' && !user?.hasSubscribed) {
    onClose();
    navigation.navigate('SubscriptionScreen'); 
    return;
  }

  // 2. Normal navigation for subscribed students/lecturers
  onClose();
  navigation.navigate(config.route, {
    ...config.params,
    lectures, // Passing the lectures you have in state
    userRole,
  });
};

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView style={StyleSheet.absoluteFill} blurType="dark" blurAmount={10} />
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <View style={styles.fabMenuContainer}>
        {actions.map((label: string, index: number) => {
  const config = ACTION_CONFIG[label];
  
  // Logic: If user is not 'lecturer' (unsubscribed/student), show a lock or redirect
 const isRestricted = label === 'Create Course' && !user?.hasSubscribed;

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
        <MaterialIcons 
          name={config.icon} 
          size={24} 
          color={'#fff'} 
        />
      </TouchableOpacity>
    </View>
  );
})}

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
});