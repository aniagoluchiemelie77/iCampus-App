import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { searchUsers } from '../api/localGetApis.ts';
import { UserIdentity } from './UserIdentity';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { UserAvatar } from './UserAvatar.tsx';
import { useTheme } from '../context/ThemeContext';
interface UserSearchOverlayProps {
  currentUser: any;
  navigation: any;
  onClose: () => void;
  colors?: {
    primary: string;
    tint: string;
  };
  onResultPress?: (user: any) => void;
  isRanking?: boolean;
  placeholder?: string;
}

export const UserSearchOverlay = ({
  placeholder,
  currentUser,
  navigation,
  onClose,
  isRanking,
  onResultPress,
}: UserSearchOverlayProps) => {
  const { colors: themeColors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(
          searchQuery,
          currentUser.tier!,
          currentUser.usertype!,
        );
        setSearchResults(results || []);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentUser]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <View
        style={[
          styles.activeSearchHeader,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <TextInput
          autoFocus
          placeholder={placeholder ? placeholder : 'Search users...'}
          style={[styles.headerSearchInput, { color: themeColors.text }]}
          placeholderTextColor={themeColors.inputTextHolder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View
        style={[
          styles.searchOverlayScreen,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        {isSearching ? (
          <View style={styles.searchEmptyState}>
            <ActivityIndicator color={themeColors.primary} size="small" />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.searchResultRow,
                  { borderBottomColor: themeColors.border },
                ]}
                onPress={() => {
                  onClose();
                  if (isRanking) {
                    onResultPress && onResultPress(item);
                  } else {
                    navigation.push('Profile', { uid: item.uid });
                  }
                }}
              >
                <UserAvatar
                  profilePic={item.profilePic}
                  firstName={item.firstname}
                  lastName={item.lastname}
                  organizationName={item.organizationName}
                  style={styles.miniAvatar}
                />
                <View style={{ flex: 1 }}>
                  <UserIdentity
                    firstname={item.firstname}
                    lastname={item.lastname}
                    username={item.username}
                    tier={item.tier}
                    isVerified={item.isVerified}
                    size="small"
                    isOrganization={item.usertype === 'enterprise'}
                    organizationName={item.organizationName}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.searchEmptyState}>
            <Text
              style={{
                color: themeColors.text,
                marginVertical: 8,
                fontSize: 14,
              }}
            >
              {searchQuery.length < 2
                ? 'Start typing to find talent...'
                : 'No results found'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeSearchHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    elevation: 4,
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 14,
  },
  searchOverlayScreen: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    paddingTop: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
  },
  miniAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,
  },
  searchEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});