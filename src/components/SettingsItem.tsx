import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  LayoutAnimation,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  toggle?: boolean;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
}

export const SettingItem = ({
  icon,
  title,
  subtitle,
  onPress,
  toggle = false,
  value = false,
  onValueChange,
  expandable = false,
  expandedContent,
}: SettingItemProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    if (toggle) {
      onValueChange?.(!value);
    } else if (expandable) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded(!expanded);
    } else {
      onPress?.();
    }
  };

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TouchableOpacity
        style={styles.itemHeader}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconBackground}>
          <MaterialIcons name={icon} size={24} color={colors.primary} />
          <View style={styles.textContainer}>
            <Text style={[styles.itemTitle, { color: colors.textDarker }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.itemSubtitle, { color: colors.text }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {toggle ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.primaryTint, true: colors.primary }}
            thumbColor={value ? colors.primary : colors.primaryTint}
          />
        ) : expandable ? (
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.text}
          />
        ) : (
          <MaterialIcons name="chevron-right" size={24} color={colors.text} />
        )}
      </TouchableOpacity>

      {expandable && expanded && (
        <View style={styles.expandedContent}>{expandedContent}</View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  expandedContent: {
    marginTop: 20,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContainer: {
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 15,
  },
});
