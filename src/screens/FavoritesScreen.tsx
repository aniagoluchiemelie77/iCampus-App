import React, { useMemo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../context/EventContext';
import { FavItem } from '../components/FavItem';
import { COLUMN_GAP } from '../components/ProductListItem';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/firebase';
import { fetchProductsByIdsFromLocalDb } from '../hooks/useSQLiteDb';
import { CustomButton } from '../assets/components/AppUIComponents';
import { ActionModal } from '../components/LogoutModal.tsx';
import { useFocusEffect } from '@react-navigation/native';

export const FavoritesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector((state: { user: User }) => state.user);
  const { handleToggleFavorite, handleDeleteAllFavorites, catalogSyncVersion } =
    useAppDataContext();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [focusRefreshKey, setFocusRefreshKey] = useState(0);

  const favoriteIds = useMemo(() => {
    return currentUser?.favorites ?? [];
  }, [currentUser?.favorites]);
  const favoriteItems = useMemo(() => {
    return fetchProductsByIdsFromLocalDb(favoriteIds);
  }, [favoriteIds, catalogSyncVersion, focusRefreshKey]);
  useFocusEffect(
    useCallback(() => {
      setFocusRefreshKey(previous => previous + 1);
    }, []),
  );

  const renderFavItem = useCallback(
    ({ item }: { item: any }) => {
      return (
        <FavItem
          product={item}
          onRemove={() => handleToggleFavorite(item.productId)}
        />
      );
    },
    [handleToggleFavorite],
  );

  const confirmDeleteAllFavorites = async () => {
    try {
      setIsDeleting(true);
      await handleDeleteAllFavorites();
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader
        title="My Favorites"
        subtitle={`${favoriteItems.length} items saved`}
        showBackButton={true}
        rightElement={
          favoriteItems.length > 0 ? (
            <CustomButton
              title="Clear Favorites"
              onPress={() => setDeleteModalVisible(true)}
              style={styles.headerBtn}
            />
          ) : undefined
        }
      />

      <FlatList
        data={favoriteItems}
        keyExtractor={item => item.productId}
        renderItem={renderFavItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        key="two-column-favorites-list"
        contentContainerStyle={[
          styles.listContent,
          favoriteItems.length === 0 && { flex: 1 },
        ]}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <EmptyState
            iconName="favorite-border"
            title="No favorites yet"
            subtitle="Tap the heart icon on any product to save it for later."
          />
        }
      />
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
          }
        }}
        onContinue={confirmDeleteAllFavorites}
        title="Delete Favorites?"
        subtitle={`Are you sure you want to permanently delete your favorites? This action cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  listContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 20,
  },
  checkoutBtn: {
    height: 50,
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutText: { fontSize: 14, fontWeight: '700' },
  headerBtn: {
    paddingHorizontal: 8,
    width: 'auto',
    height: 35,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
