import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {UserAvatar} from './UserAvatar';
import {UserIdentity} from './UserIdentity';

interface UserCardProps {
  profilePic?: string | string[];
  firstName?: string;
  lastName?: string;
  isVerified?: boolean;
  department?: string;
  identifierNumber?: string; // Matric Number or Staff ID
  identifierLabel?: string;  // e.g. "Matric No." or "Staff ID"
  currentLevel?: string | number; // e.g. "400 Level" or "Professor"
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
}

export const UserProfileCard: React.FC<UserCardProps> = ({
  profilePic,
  firstName = '',
  lastName = '',
  isVerified = false,
  department,
  identifierNumber,
  identifierLabel = 'ID',
  currentLevel,
  size = 'medium',
  containerStyle,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
        containerStyle,
      ]}
    >
      <View style={styles.headerRow}>
        <UserAvatar
          profilePic={profilePic}
          firstName={firstName}
          lastName={lastName}
          style={[
            styles.avatar,
            size === 'small' ? styles.avatarSmall : size === 'large' ? styles.avatarLarge : styles.avatarMedium,
          ]}
        />
        <View style={styles.identityWrapper}>
          <UserIdentity
            firstname={firstName}
            lastname={lastName}
            tier='free'
            isVerified={isVerified}
            size={size}
            containerStyle={styles.identityContainerOverride}
          />

          {(department || identifierNumber || currentLevel) && (
            <View style={styles.detailsMeta}>
              {department && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="school-outlined" size={12} color={colors.text + '99'} />
                  <Text style={[styles.metaText, { color: colors.text + '99' }]} numberOfLines={1}>
                    {department}
                  </Text>
                </View>
              )}

              {identifierNumber && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="badge-outlined" size={12} color={colors.text + '99'} />
                  <Text style={[styles.metaText, { color: colors.text + '99' }]} numberOfLines={1}>
                    {identifierLabel}: {identifierNumber}
                  </Text>
                </View>
              )}

              {currentLevel && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="layers-outlined" size={12} color={colors.text + '99'} />
                  <Text style={[styles.metaText, { color: colors.text + '99' }]} numberOfLines={1}>
                    {currentLevel} Level
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  identityContainerOverride: {
    width: '100%',
    marginBottom: 5,
  },
  detailsMeta: {
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  avatar: {
    borderRadius: 24,
    alignContent: 'center',
  },
  avatarSmall: {
    width: 36,
    height: 36,
  },
  avatarMedium: {
    width: 48,
    height: 48,
  },
  avatarLarge: {
    width: 64,
    height: 64,
  },
});