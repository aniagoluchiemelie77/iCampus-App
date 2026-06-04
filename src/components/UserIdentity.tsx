import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TIER_COLORS } from '../constants/inAppConstants';
import { useTheme } from '../context/ThemeContext';

interface UserIdentityProps {
  firstname: string;
  lastname?: string;
  username?: string;
  tier: 'free' | 'pro' | 'premium';
  isVerified?: boolean;
  showVerifyIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
  isOrganization?: boolean;
  organizationName?: string;
}

export const UserIdentity: React.FC<UserIdentityProps> = ({
  firstname,
  lastname = '',
  username = '',
  tier = 'free',
  isVerified = false,
  showVerifyIcon = false,
  size = 'medium',
  containerStyle,
  isOrganization = false,
  organizationName = '',
}) => {
  const { colors } = useTheme();
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.free;
  const displayName = isOrganization
    ? organizationName
    : `${firstname} ${lastname}`;

  return (
    <View
      style={[
        styles.container,
        containerStyle,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Text
        style={[
          styles.name,
          { color: colors.text },
          isSmall ? styles.nameSmall : isLarge ? styles.nameLarge : null,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {displayName} {username ? `(@${username})` : ''}
      </Text>
      {tier !== 'free' && (
        <MaterialIcons
          name="verified"
          size={isSmall ? 13 : isLarge ? 20 : 15}
          color={isOrganization ? TIER_COLORS.enterprise : tierColor}
          style={styles.iconMargin}
        />
      )}
      {isVerified && showVerifyIcon && (
        <MaterialIcons
          name={isOrganization ? 'business' : 'outline-verified-user'}
          size={isLarge ? 20 : isSmall ? 13 : 16}
          color={colors.primary}
          style={styles.iconMargin}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: '700',
    fontSize: 14,
  },
  nameSmall: { fontSize: 12 },
  nameLarge: { fontSize: 20, fontWeight: '800' },
  iconMargin: {
    marginLeft: 4,
  },
});
