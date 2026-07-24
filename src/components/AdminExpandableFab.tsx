import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';

interface FABProps {
  isVisible: boolean;
  onClose: () => void;
  actions: string[];
}
const ACTION_CONFIG: Record<
  string,
  { icon: string; route: string; params?: any; category?: string }
> = {
  // --- General ---
  'Search': {
    icon: 'search-outlined',
    route: 'AdminSearchScreen',
    params: {},
  },
  'Notify': {
    icon: 'notification-add-outlined',
    route: 'CreateNotification',
    params: {},
  },
};

export const AdminExpandableFAB = ({
  isVisible,
  onClose,
  actions,
}: FABProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  if (!isVisible) return null;
  const handleAction = (label: string) => {
    const config = ACTION_CONFIG[label];
    if (!config) return;
    onClose();
    if (config.route) {
      navigation.navigate(config.route, {
        ...config.params,
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
                    handleAction(label)
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
});