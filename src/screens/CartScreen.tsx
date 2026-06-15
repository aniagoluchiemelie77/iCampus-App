import React, { useMemo, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { CartItem } from '../components/CartItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../components/EventContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../types/firebase';

interface CartItemEntry {
  productId: string;
  quantity: number;
}
export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const currentUser = useAppSelector(state => state.user);
  const { handleCartItemToggle, allProducts, handleClearCart } =
    useAppDataContext();

  // Safely cast cart array baseline layers
  const cartData = useMemo<CartItemEntry[]>(() => {
    return currentUser?.cart ?? [];
  }, [currentUser?.cart]);

  const itemCount = cartData.length;
  const productDictionary = useMemo(() => {
    const map = new Map<string, Product>();
    if (Array.isArray(allProducts)) {
      allProducts.forEach(product => {
        if (product.productId) map.set(product.productId, product);
      });
    }
    return map;
  }, [allProducts]);

  const { totalPrice, containsInvalidItems } = useMemo(() => {
    let total = 0;
    let missingItemsFlag = false;

    cartData.forEach(item => {
      const product = productDictionary.get(item.productId);
      if (product) {
        total += product.priceInPoints * item.quantity;
      } else {
        missingItemsFlag = true;
      }
    });

    return { totalPrice: total, containsInvalidItems: missingItemsFlag };
  }, [cartData, productDictionary]);

  const handleRemoveItem = useCallback(
    (product: Product) => {
      handleCartItemToggle(product);
    },
    [handleCartItemToggle],
  );

  const renderItem = useCallback(
    ({ item }: { item: CartItemEntry }) => {
      const productData = productDictionary.get(item.productId);
      if (!productData) return null;

      return (
        <CartItem
          cartEntry={item}
          product={productData}
          onRemove={() => handleRemoveItem(productData)}
        />
      );
    },
    [productDictionary, handleRemoveItem],
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader
        title="My Cart"
        subtitle={`${itemCount} ${
          itemCount === 1 ? 'item' : 'items'
        } in your basket`}
        showBackButton={true}
        rightElement={
          itemCount > 0 ? (
            <TouchableOpacity
              onPress={handleClearCart}
              style={[styles.headerBtn, { backgroundColor: colors.btnColor }]}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.headerBtnText, { color: colors.btnTextColor }]}
              >
                Clear Cart
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={cartData}
        keyExtractor={item => item.productId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <EmptyState
            iconName="remove-shopping-cart"
            title="Your cart is empty"
            subtitle="Looks like you haven't added any campus deals yet."
          />
        }
      />

      {itemCount > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total Balance
            </Text>
            <CurrencyDisplay value={totalPrice} size="large" />
          </View>

          <TouchableOpacity
            style={[
              styles.checkoutBtn,
              { backgroundColor: colors.btnColor },
              containsInvalidItems && { opacity: 0.5 },
            ]}
            onPress={() => navigation.navigate('Checkout')}
            disabled={containsInvalidItems}
          >
            <Text style={[styles.checkoutText, { color: colors.btnTextColor }]}>
              {containsInvalidItems
                ? 'Contains Unavailable Items'
                : 'Proceed to Checkout'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  headerBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 14,
    alignContent: 'center',
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    alignContent: 'center',
    paddingBottom: 50,
    marginTop: 15,
    width: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: -15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
    padding: 10,
  },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  checkoutBtn: {
    width: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignContent: 'center',
    alignSelf: 'center',
  },
  checkoutText: { fontSize: 14, fontWeight: '700' },
});
