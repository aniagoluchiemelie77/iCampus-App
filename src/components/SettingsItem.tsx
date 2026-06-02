import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

interface settingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  toggle?: boolean;
  value?: boolean;
}

export const SettingItem = ({
  icon,
  title,
  subtitle,
  onPress,
  toggle = false,
  value = false,
}: settingItemProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.backgroundSecondary }]}
      onPress={onPress}
      disabled={toggle}
      activeOpacity={0.7}
    >
      <View style={styles.iconBackground}>
        <MaterialIcons name={icon} size={22} color={colors.text} />
        <View style={styles.textContainer}>
          <Text style={[styles.itemTitle, {color: colors.text}]}>{title}</Text>
          {subtitle && <Text style={[styles.itemSubtitle, {color: colors.text}]}>{subtitle}</Text>}
        </View>
      </View>
      {toggle ? (
        <Switch
          value={value}
          trackColor={{ false: colors.primaryTint, true: colors.primary }}
          thumbColor={value ? colors.primary : colors.primaryTint}
        />
      ) : (
        <MaterialIcons
          name="chevron-right"
          size={24}
          color={colors.text}
        />
      )}
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 13,
    marginBottom: 10,
  },
  iconBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
});