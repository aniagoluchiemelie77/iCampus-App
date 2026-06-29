import React, { useMemo, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../context/EventContext';
import { FavItem } from '../components/FavItem';
import { useTheme } from '../context/ThemeContext';
import { User, Product } from '../types/firebase';

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
            <TouchableOpacity
              onPress={handleConfirmClearAll}
              style={[styles.headerBtn, { backgroundColor: colors.btnColor }]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.headerBtnText, { color: colors.btnTextColor }]}
              >
                Clear Favorites
              </Text>
            </TouchableOpacity>
          ) : undefined // Safely hide clear button when list is already empty
        }
      />

      <FlatList
        data={favoriteItems}
        keyExtractor={item => item.productId}
        renderItem={renderFavItem}
        numColumns={2}
        // Changing the key forces a safe recreation when columns structure changes internally
        key="two-column-favorites-list"
        contentContainerStyle={[
          styles.listContent,
          favoriteItems.length === 0 && { flex: 1 }, // Centering empty state cleanly
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
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: colors.btnColor }]}
            onPress={handleAddAllFavoritesToCart}
            activeOpacity={0.8}
          >
            <Text style={[styles.checkoutText, { color: colors.btnTextColor }]}>
              Add all to cart
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', paddingHorizontal: 15 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    marginVertical: 10,
    alignContent: 'center',
    width: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 15,
  },
  checkoutBtn: {
    width: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignContent: 'center',
    alignSelf: 'center',
  },
  checkoutText: { fontSize: 14, fontWeight: '700' },
  headerBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    alignContent: 'center',
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
