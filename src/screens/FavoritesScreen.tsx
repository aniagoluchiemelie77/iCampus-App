import React, { useMemo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../context/EventContext';
import { FavItem } from '../components/FavItem';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types/firebase';
import { db } from '../hooks/useSQLiteDb';
import { CustomButton } from '../assets/components/AppUIComponents';
import { ActionModal } from '../components/LogoutModal.tsx';

export const FavoritesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector((state: { user: User }) => state.user);
  const {
    handleToggleFavorite,
    handleAddAllFavoritesToCart,
    handleDeleteAllFavorites,
  } = useAppDataContext();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const favoriteIds = useMemo(() => {
    return currentUser?.favorites ?? [];
  }, [currentUser?.favorites]);
  const favoriteItems = useMemo(() => {
    if (favoriteIds.length === 0) return [];

    try {
      const placeholders = favoriteIds.map(() => '?').join(',');
      const queryResult = db.execute(
        `SELECT * FROM products WHERE productId IN (${placeholders});`,
        favoriteIds,
      );

      const rows = queryResult?.rows;
      const rawProducts = Array.isArray(rows)
        ? rows
        : rows && '_array' in rows
          ? rows._array
          : [];

      return rawProducts.map((item: any) => ({
        ...item,
        mediaUrls: item.mediaUrls ? JSON.parse(item.mediaUrls) : [],
        physicalDetails: item.physicalDetails
          ? JSON.parse(item.physicalDetails)
          : null,
      }));
    } catch (error) {
      console.error('Failed to load favorite products from SQLite:', error);
      return [];
    }
  }, [favoriteIds]);

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

      {favoriteItems.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <CustomButton
            title="Add all to cart"
            style={styles.checkoutBtn}
            onPress={handleAddAllFavoritesToCart}
          />
        </View>
      )}
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
          }
        }}
        onContinue={handleDeleteAllFavorites}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
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
    height: 40,
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
