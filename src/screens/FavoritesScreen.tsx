import React from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {EmptyState} from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../components/hooks';
import {PageHeader} from '../components/PageHeader';
import { useAppDataContext } from '../components/EventContext';
import {FavItem} from '../components/FavItem';
import { useTheme } from '../context/ThemeContext';

export const FavoritesScreen = () => {
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const {
    allProducts,
    handleToggleFavorite,
    handleAddAllFavoritesToCart,
    handleDeleteAllFavorites,
  } = useAppDataContext();

  const favoriteItems =
    allProducts?.filter(product =>
      currentUser?.favorites?.includes(product.productId),
    ) ?? [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader
        title="My Favorites"
        subtitle={`${favoriteItems.length} items saved`}
        showBackButton={true}
        rightElement={
          <TouchableOpacity
            onPress={handleDeleteAllFavorites}
            style={[styles.headerBtn, { backgroundColor: colors.btnColor }]}
          >
            <Text
              style={[styles.headerBtnText, { color: colors.btnTextColor }]}
            >
              Clear Favorites
            </Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={favoriteItems}
        keyExtractor={item => item.productId}
        numColumns={2}
        renderItem={({ item }) => (
          <FavItem
            product={item}
            onRemove={() => handleToggleFavorite(item.productId)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            iconName="favorite-border"
            title="No favorites yet"
            subtitle="Tap the heart icon on any product to save it for later."
            style={{ marginTop: 80 }}
          />
        }
        contentContainerStyle={styles.listContent}
      />
      {favoriteItems.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: colors.btnColor }]}
            onPress={handleAddAllFavoritesToCart}
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