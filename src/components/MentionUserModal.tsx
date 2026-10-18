import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useUserSearch } from '../hooks/useUserDetails';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';

interface MentionUserModalProps {
  visible: boolean;
  initialKeyword?: string;
  suggestions?: any[];
  onSelect: (user: any) => void;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;

export const MentionUserModal = ({
  visible,
  initialKeyword = '',
  suggestions = [],
  onSelect,
  onClose,
}: MentionUserModalProps) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState(initialKeyword);
  const { results, loading, searchUsers, clearResults } = useUserSearch();

  useEffect(() => {
    if (visible) {
      setQuery(initialKeyword);
      clearResults();
    }
  }, [visible, initialKeyword, clearResults]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      clearResults();
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchUsers(trimmed);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchUsers, clearResults]);

  const trimmedQuery = query.trim();
  const data = trimmedQuery.length === 0 ? suggestions : results;

  const handleSelect = useCallback(
    (user: any) => {
      clearResults();
      onSelect(user);
    },
    [onSelect, clearResults],
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
                Mention iCampus User
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <MaterialIcons
                name="alternate-email"
                size={20}
                color={colors.inputTextHolder}
              />
              <TextInput
                autoFocus
                autoCorrect={false}
                placeholder="Search people to mention..."
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.searchInput, { color: colors.text }]}
                value={query}
                onChangeText={setQuery}
              />
              {loading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>

            {/* Results */}
            {data.length > 0 ? (
              <FlatList
                data={data}
                style={styles.resultsList}
                keyExtractor={(item, index) =>
                  item.uid || item._id || String(index)
                }
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => handleSelect(item)}
                  >
                    <UserAvatar
                      profilePic={item.profilePic}
                      firstName={item.firstname}
                      lastName={item.lastname}
                      organizationName={item.organizationName}
                      style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
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
                    <MaterialIcons
                      name="add-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons
                  name="person-search"
                  size={36}
                  color={colors.inputTextHolder}
                />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {loading
                    ? 'Searching...'
                    : trimmedQuery.length === 0
                      ? 'Start typing to search for people...'
                      : 'No users found'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '80%',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    padding: 0,
  },
  resultsList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  resultsContent: {
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
  },
});

export default MentionUserModal;
