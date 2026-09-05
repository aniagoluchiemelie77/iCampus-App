import React, { useMemo, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { CartItem } from '../components/CartItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../hooks/hooks';
import { PageHeader } from '../components/PageHeader';
import { useAppDataContext } from '../context/EventContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { Product } from '../types/firebase';
import { CustomButton } from '../assets/components/AppUIComponents';

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
        } in your cart`}
        showBackButton={true}
        rightElement={
          itemCount > 0 ? (
            <CustomButton
              title="Clear Cart"
              onPress={handleClearCart}
              style={styles.headerBtn}
            />
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
            subtitle="Looks like you haven't added any listings yet."
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
          <CustomButton
            title={
              containsInvalidItems
                ? 'Contains Unavailable Items'
                : 'Proceed to Checkout'
            }
            style={[
              styles.checkoutBtn,
              containsInvalidItems && { opacity: 0.7 },
            ]}
            onPress={() => navigation.navigate('Checkout')}
            disabled={containsInvalidItems}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: {
    paddingHorizontal: 8,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
    paddingHorizontal: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 15,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
  },
  totalLabel: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  checkoutBtn: {
    paddingHorizontal: 15,
    marginTop: 10,
    height: 50,
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
