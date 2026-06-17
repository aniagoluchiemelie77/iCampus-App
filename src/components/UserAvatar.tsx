import { PRIMARY_COLOR } from '../assets/styles/colors';
import React from 'react';
import {
  Image,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ImageStyle,
} from 'react-native';

interface UserAvatarProps {
  profilePic?: string[] | string | null;
  firstName?: string;
  lastName?: string;
  username?: string;
  style?: StyleProp<ImageStyle>;
  organizationName?: string;
}

export const UserAvatar = ({
  profilePic,
  firstName,
  lastName,
  username,
  style,
  organizationName,
}: UserAvatarProps) => {
  const uri = Array.isArray(profilePic) ? profilePic.at(-1) : profilePic;
  const getInitials = () => {
    if (organizationName) {
      return organizationName.substring(0, 2).toUpperCase();
    }
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (username) return username[0].toUpperCase();
    if (lastName) return lastName[0].toUpperCase();
    return '?';
  };

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }
  return (
    <View style={[styles.defaultContainer, style]}>
      <Text style={styles.initialsText}>{getInitials()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  defaultContainer: {
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  initialsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
