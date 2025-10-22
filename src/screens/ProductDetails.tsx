import React from 'react';
import { Text, Image, StyleSheet } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { Product } from '../types/firebase';
import { ScrollView } from 'react-native-gesture-handler';

type RouteParams = {
  ProductDetails: {
    product: Product;
  };
};

const ProductDetails = () => {
  const route = useRoute<RouteProp<RouteParams, 'ProductDetails'>>();
  const { product } = route.params;

  return (
    <ScrollView style={styles.container}>
      {product.mediaUrls && (
        <Image source={{ uri: product.mediaUrls[0] }} style={styles.image} />
      )}
      <Text style={styles.name}>{product.title}</Text>
      <Text style={styles.description}>{product.description}</Text>
      <Text style={styles.price}>₦{product.priceInPoints}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 20,
    borderRadius: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#000',
    marginBottom: 15,
  },
  price: {
    fontSize: 18,
    color: '#f54b02',
    fontWeight: '600',
  },
});

export default ProductDetails;
