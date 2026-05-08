import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useEventContext } from '../context/EventContext';

export const ProductCard = ({ product, onPress }: any) => {
  const { toggleFavorite, addToCart, currentUser } = useEventContext();

  const isFavorited = currentUser?.favorites?.includes(product.productId);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={{ uri: product.mediaUrls[0] }} style={styles.thumbnail} />
      
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
        
        <View style={styles.priceRow}>
          <MaterialIcons name="diamond" size={14} color="#B9F2FF" />
          <Text style={styles.priceText}>{product.priceInPoints}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            onPress={() => toggleFavorite(product.productId)}
            style={styles.iconBtn}
          >
            <MaterialIcons 
              name={isFavorited ? "favorite" : "favorite-border"} 
              size={20} 
              color={isFavorited ? "red" : "#666"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => addToCart(product.productId)}
            style={styles.cartBtn}
          >
            <MaterialIcons name="add-shopping-cart" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
export const addToCart = async (productId: string) => {
  // Optimistic Update
  setCurrentUser(prev => ({
    ...prev,
    cart: [...(prev.cart || []), productId]
  }));

  const result = await updateCartAPI(currentUser.uid, productId, 'add');
  if (!result.success) {
    // Rollback logic...
    Toast.show({ type: 'error', text1: 'Failed to add to cart' });
  }
};

export const toggleFavorite = async (productId: string) => {
  const isFav = currentUser.favorites?.includes(productId);
  
  // Optimistic Update
  setCurrentUser(prev => ({
    ...prev,
    favorites: isFav 
      ? prev.favorites.filter(id => id !== productId)
      : [...(prev.favorites || []), productId]
  }));

  const result = await toggleFavoriteAPI(currentUser.uid, productId);
  if (!result.success) {
    // Rollback logic...
  }
};
const styles = StyleSheet.create({
     card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden'
  },
  thumbnail: { width: '100%', height: 150, resizeMode: 'cover' },
  info: { padding: 8 },
  title: { fontSize: 14, fontWeight: 'bold' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceText: { fontWeight: '700', marginLeft: 4, color: '#333' },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 10,
    alignItems: 'center'
  },
  cartBtn: {
    backgroundColor: '#007AFF',
    padding: 6,
    borderRadius: 8
  },
  iconBtn: { padding: 4 }
})