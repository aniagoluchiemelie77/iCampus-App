import React, { useMemo, useCallback } from 'react';
import { FlatList, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../context/EventContext';
import { FavItem } from '../components/FavItem';
import { useTheme } from '../context/ThemeContext';
import { User, Product } from '../types/firebase';
import { CustomButton } from '../assets/components/AppUIComponents';

export const FavoritesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector((state: { user: User }) => state.user);
  const {
    allProducts,
    handleToggleFavorite,
    handleAddAllFavoritesToCart,
    handleDeleteAllFavorites,
  } = useAppDataContext();
  const favoriteItems = useMemo(() => {
    if (!allProducts || !currentUser?.favorites) return [];
    const favoriteSet = new Set(currentUser.favorites);
    return allProducts.filter(product => favoriteSet.has(product.productId));
  }, [allProducts, currentUser?.favorites]);

  const handleConfirmClearAll = () => {
    Alert.alert(
      'Clear Favorites',
      'Are you sure you want to remove all items from your favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: handleDeleteAllFavorites,
        },
      ],
    );
  };
  const renderFavItem = useCallback(
    ({ item }: { item: Product }) => {
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
              onPress={handleConfirmClearAll}
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
