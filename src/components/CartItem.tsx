import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Product, CartItem as CartItemType } from '../types/firebase'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';

interface CartItemProps {
  cartEntry: CartItemType; 
  product: Product; 
  onRemove: (product: Product) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ cartEntry, product, onRemove }) => {
  return (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: product.mediaUrls[0] }} style={styles.image} />

      <View style={styles.details}>
        <View style={styles.detailSubdiv}>
          <View style={styles.headerRow}>
            <Text style={styles.typeTag}>{product.type.toUpperCase()}</Text>
            {cartEntry.quantity > 1 && (
              <Text style={styles.quantityBadge}>x{cartEntry.quantity}</Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {product.title}
          </Text>
          {(cartEntry.selectedSize || cartEntry.selectedColor) && (
            <View style={styles.variationRow}>
              {cartEntry.selectedSize && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    Size: {cartEntry.selectedSize}
                  </Text>
                </View>
              )}
              {cartEntry.selectedColor && (
                <View style={styles.chip}>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: cartEntry.selectedColor.toLowerCase(),
                      },
                    ]}
                  />
                  <Text style={styles.chipText}>{cartEntry.selectedColor}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceDiv}>
            <Text style={styles.price}>
              {(product.priceInPoints * cartEntry.quantity).toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                },
              )}
            </Text>
            <MaterialIcons name="diamond" size={20} color={PRIMARY_COLOR} />
          </View>

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
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    width: '90%'
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 14,
  },
  details: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize'
  },
  quantityBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
    marginTop: 4,
  },
  variationRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    color: '#2222',
    fontWeight: '600',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    borderWidth: 0.5,
    borderColor: PRIMARY_COLOR,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    width: '100%',
    marginTop: 8,
  },
  priceDiv:{
    flexDirection: 'row',
    alignItems: 'baseline'
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  removeButton: {
    alignContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR
  },
  removeText: {
    fontSize: 12,
    color: '#FF4D4D',
    fontWeight: '600',
    marginLeft: 4,
  },
  detailSubdiv: {
    width: '100%'
  }
});
