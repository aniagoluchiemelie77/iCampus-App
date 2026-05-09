import React from 'react';
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {CartItem} from '../components/CartItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import {EmptyState} from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../components/hooks';
import {PageHeader} from '../components/PageHeader';
import { PRIMARY_COLOR } from 'assets/styles/colors';
import { useAppDataContext } from '../components/EventContext';

export const CartScreen = () => {
  const currentUser = useAppSelector(state => state.user);
  const { handleCartItemToggle, allProducts, handleClearCart } =
    useAppDataContext();
  const cartData = currentUser?.cart ?? [];
  const itemCount = cartData.length;
  const totalPrice = cartData.reduce((acc, item) => {
    const product = allProducts?.find(p => p.productId === item.productId);
    const itemTotal = product ? product.priceInPoints * item.quantity : 0;
    return acc + itemTotal;
  }, 0);

  return (
    <SafeAreaView style={styles.container}>
      <PageHeader
        title="My Cart"
        subtitle={`${itemCount} ${
          itemCount === 1 ? 'item' : 'items'
        } in your basket`}
        showBackButton={true}
        rightElement={
          <TouchableOpacity onPress={handleClearCart} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Clear Cart</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={currentUser?.cart ?? []}
        keyExtractor={item => item.productId}
        renderItem={({ item }) => {
          const productData = allProducts.find(
            p => p.productId === item.productId,
          );
          if (!productData) return null;
          return (
            <CartItem
              cartEntry={item}
              product={productData}
              onRemove={() => handleCartItemToggle(productData)}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            iconName="remove-shopping-cart-outlined"
            title="Your cart is empty"
            subtitle="Looks like you haven't added any campus deals yet."
            style={{ marginTop: 80 }}
          />
        }
      />
      {cartData.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Balance</Text>
            <Text style={styles.totalValue}>{totalPrice} Points</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn}>
            <Text style={styles.checkoutText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  headerBtnText: {
    fontSize: 14,
    color: '#fff',
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
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
    padding: 20,
  },
  totalLabel: { color: '#222', fontSize: 15, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: '800', color: PRIMARY_COLOR },
  checkoutBtn: {
    width: '80%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignContent: 'center',
  },
  checkoutText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});