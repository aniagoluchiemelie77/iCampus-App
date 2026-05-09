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
    const {handleCartItemToggle, allProducts} = useAppDataContext();
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
        subtitle={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your basket`}
        showBackButton={true}
        rightElement={
          <TouchableOpacity>
            <Text>Clear Cart</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={currentUser?.cart ?? []}
        keyExtractor={(item) => item.productId}
        renderItem={({ item }) => {
            const productData = allProducts.find(p => p.productId === item.productId);    
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  headerCount: { fontSize: 16, color: '#6C63FF', fontWeight: '600', marginBottom: 4 },
  listContent: { alignItems: 'center', paddingBottom: 50, marginTop: 15 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    alignItems: 'center'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%'
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