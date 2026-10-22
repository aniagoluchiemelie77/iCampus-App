import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  const isSuggesting = trimmedQuery.length === 0;
  const data = isSuggesting ? suggestions : results;

  const handleSelect = useCallback(
    (user: any) => {
      clearResults();
      onSelect(user);
    },
    [onSelect, clearResults],
  );

  const renderRow = ({ item }: { item: any }) => {
    const isOrganization = item.usertype === 'enterprise';
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`Mention ${
          isOrganization
            ? item.organizationName
            : `${item.firstname || ''} ${item.lastname || ''}`.trim()
        }`}
        android_ripple={{ color: colors.primary + '14' }}
        style={({ pressed }) => [
          styles.userRow,
          pressed && { backgroundColor: colors.primary + '0F' },
        ]}
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
            firstname={item.firstname || ''}
            lastname={item.lastname}
            tier={item.tier}
            isVerified={item.isVerified}
            size="medium"
            isOrganization={isOrganization}
            organizationName={item.organizationName}
            containerStyle={styles.identity}
          />
          {!!item.username && (
            <Text style={[styles.handle, { color: colors.text }]} numberOfLines={1}>
              @{item.username}
            </Text>
          )}
        </View>
        <View style={[styles.mentionChip, { backgroundColor: colors.primary + '1A' }]}>
          <MaterialIcons name="alternate-email" size={14} color={colors.primary} />
          <Text style={[styles.mentionChipText, { color: colors.primary }]}>Mention</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Backdrop sits behind the sheet, so touches inside the sheet (and
            list scrolling) never reach it. */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close mention picker"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
          >
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: colors.primary + '1A' }]}>
                <MaterialIcons name="alternate-email" size={20} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
                  Mention someone
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.text }]}>
                  They'll be notified when you post
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
              >
                <MaterialIcons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.background, borderColor: colors.primary + '55' },
              ]}
            >
              <MaterialIcons name="search" size={20} color={colors.inputTextHolder} />
              <TextInput
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                placeholder="Search by name or username"
                placeholderTextColor={colors.inputTextHolder}
                style={[styles.searchInput, { color: colors.text }]}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                !!query && (
                  <TouchableOpacity
                    onPress={() => setQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Clear search"
                  >
                    <MaterialIcons name="cancel" size={18} color={colors.inputTextHolder} />
                  </TouchableOpacity>
                )
              )}
            </View>

            {data.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                {isSuggesting ? 'People you follow' : `Results for "${trimmedQuery}"`}
              </Text>
            )}

            {/* Results */}
            {data.length > 0 ? (
              <FlatList
                data={data}
                style={styles.resultsList}
                keyExtractor={(item, index) => item.uid || item._id || String(index)}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsContent}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: colors.border + '66' }]} />
                )}
                renderItem={renderRow}
              />
            ) : (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '12' }]}>
                  <MaterialIcons
                    name={loading ? 'hourglass-empty' : isSuggesting ? 'group-add' : 'person-search'}
                    size={28}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textDarker }]}>
                  {loading
                    ? 'Searching…'
                    : isSuggesting
                      ? 'Find someone to mention'
                      : 'No matching people'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {loading
                    ? 'Looking through iCampus users.'
                    : isSuggesting
                      ? 'Type a name or username to search everyone on iCampus.'
                      : 'Check the spelling or try their username.'}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    maxHeight: '78%',
    minHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 12.5, marginTop: 2, opacity: 0.75 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 2,
  },
  resultsList: { flexGrow: 0, flexShrink: 1 },
  resultsContent: { paddingBottom: 16 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  userInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  identity: { flexShrink: 1, backgroundColor: 'transparent' },
  handle: { fontSize: 12.5, marginTop: 2, opacity: 0.7 },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  mentionChipText: { fontSize: 12, fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  emptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 14 },
  emptyText: { fontSize: 13, marginTop: 6, textAlign: 'center', opacity: 0.75, lineHeight: 19 },
});

export default MentionUserModal;
