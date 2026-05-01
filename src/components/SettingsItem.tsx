import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from 'assets/styles/colors';

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
}: settingItemProps) => (
  <TouchableOpacity
    style={styles.item}
    onPress={onPress}
    disabled={toggle}
    activeOpacity={0.7}
  >
    <View style={styles.iconBackground}>
      <MaterialIcons name={icon} size={22} color={PRIMARY_COLOR_TINT} />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
    </View>
    {toggle ? (
      <Switch
        value={value}
        trackColor={{ false: PRIMARY_COLOR_TINT, true: PRIMARY_COLOR_TINT }}
        thumbColor={value ? PRIMARY_COLOR : PRIMARY_COLOR_TINT_MAIN}
      />
    ) : (
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={PRIMARY_COLOR_TINT}
      />
    )}
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: '#222',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#2222',
    marginTop: 2,
  },
});