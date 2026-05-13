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
import {
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors.ts';
import { UserAvatar } from './UserAvatar.tsx';

interface UserSearchOverlayProps {
  currentUser: any;
  navigation: any;
  onClose: () => void;
  colors: {
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
  colors,
  isRanking,
  onResultPress,
}: UserSearchOverlayProps) => {
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
      <View style={styles.activeSearchHeader}>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color={colors.tint} />
        </TouchableOpacity>
        <TextInput
          autoFocus
          placeholder={placeholder ? placeholder : 'Search users...'}
          style={styles.headerSearchInput}
          placeholderTextColor={colors.tint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={styles.searchOverlayScreen}>
        {isSearching ? (
          <View style={styles.searchEmptyState}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResultRow}
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
            <Text style={{ color: colors.tint, marginVertical: 8 }}>
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
    backgroundColor: '#fadccc',
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    elevation: 4,
  },
    headerSearchInput: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    color: '#222',
  },
   // The Full White Screen Overlay
    searchOverlayScreen: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#FFF',
      zIndex: 100,
      paddingTop: 10,
    },
    searchResultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 0.5,
      borderBottomColor: PRIMARY_COLOR_TINT,
    },
    miniAvatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      marginRight: 10,
      backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    },
    resultName: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1A1D1E',
    },
    resultSub: {
      fontSize: 12,
      marginLeft: 4,
      color: PRIMARY_COLOR_TINT,
    },
    searchEmptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
});