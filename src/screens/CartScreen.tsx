import React from 'react';
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {CartItem} from '../components/CartItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import {EmptyState} from '../components/EmptyFlatlistComponent';
import { useAppSelector } from '../components/hooks';
import {PageHeader} from '../components/PageHeader';
import { useAppDataContext } from '../components/EventContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export const CartScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
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
          <TouchableOpacity
            onPress={handleClearCart}
            style={[styles.headerBtn, { backgroundColor: colors.btnColor }]}
          >
            <Text style={[styles.headerBtnText, {color: colors.btnTextColor}]}>Clear Cart</Text>
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
            style={[styles.checkoutBtn, { backgroundColor: colors.btnColor }]}
            onPress={() => navigation.navigate('Checkout')}
          >
            <Text style={[styles.checkoutText, { color: colors.btnTextColor }]}>
              Proceed to Checkout
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