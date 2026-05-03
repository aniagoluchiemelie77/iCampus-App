import { PRO_BADGE_COLOR, PREMIUM_BADGE_COLOR, ENTERPRISE_BADGE_COLOR, PRIMARY_COLOR } from 'assets/styles/colors';
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const TIER_COLORS: Record<string, string> = {
  pro: PRO_BADGE_COLOR,     
  premium: PREMIUM_BADGE_COLOR, 
  enterprise: ENTERPRISE_BADGE_COLOR 
};

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
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.free;
  const displayName = isOrganization
    ? organizationName
    : `${firstname} ${lastname}`;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 1. Full Name / Username */}
      <Text
        style={[
          styles.name,
          isSmall ? styles.nameSmall : isLarge ? styles.nameLarge : null,
        ]}
        numberOfLines={1}
      >
        {displayName} {username ? `(@${username})` : ''}
      </Text>
      {/* 2. Tier Badge (The Verified Checkmark style) */}
      {tier !== 'free' && (
        <MaterialIcons
          name="verified"
          size={isSmall ? 13 : isLarge ? 20 : 15}
          color={isOrganization ? TIER_COLORS.enterprise : tierColor}
          style={styles.iconMargin}
        />
      )}
      {/* 3. Identity Verification (The Outline style - Profile Page only) */}
      {isVerified && showVerifyIcon && (
        <MaterialIcons
          name={isOrganization ? 'business' : 'outline-verified-user'}
          size={isLarge ? 20 : isSmall ? 13 : 16}
          color={PRIMARY_COLOR}
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
    color: '#222',
    fontSize: 15
  },
  nameSmall: { fontSize: 12 },
  nameLarge: { fontSize: 20, fontWeight: '800' },
  iconMargin: {
    marginLeft: 4,
  },
});