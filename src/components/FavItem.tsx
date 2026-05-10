import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Product } from '../types/firebase'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useNavigation } from '@react-navigation/native';

interface FavItemProps {
  product: Product;
  onRemove: (product: Product) => void;
}

export const FavItem: React.FC<FavItemProps> = ({ product, onRemove }) => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('ProductDetails', {
          productId: product.productId,
        })
      }
    >
      <Image source={{ uri: product.mediaUrls[0] }} style={styles.image} />

      <View style={styles.details}>
        <View style={styles.detailSubdiv}>
          <View style={styles.headerRow}>
            <Text style={styles.typeTag}>{product.type.toUpperCase()}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <CurrencyDisplay value={product.priceInPoints} size="medium" />
          <TouchableOpacity
            onPress={() => onRemove(product)}
            style={styles.removeButton}
          >
            <MaterialIcons name="delete-outlined" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fadccc',
    borderRadius: 20,
    padding: 10,
    marginBottom: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    width: '90%',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 14,
  },
  details: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  headerRow: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
    marginTop: 8,
  },
  removeButton: {
    alignContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  removeText: {
    fontSize: 12,
    color: '#FF4D4D',
    fontWeight: '600',
    marginLeft: 4,
  },
  detailSubdiv: {
    width: '100%',
  },
});