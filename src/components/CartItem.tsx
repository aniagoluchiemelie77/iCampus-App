import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Product, CartItem as CartItemType } from '../types/firebase'; 
import { CurrencyDisplay } from './CurrencyFormatter';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

interface CartItemProps {
  cartEntry: CartItemType;
  product: Product;
  onRemove?: (product: Product) => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  cartEntry,
  product,
  onRemove,
}) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
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
            <Text style={[styles.typeTag, { color: colors.primary }]}>
              {product.niche.toUpperCase()}
            </Text>
            {cartEntry.quantity > 1 && (
              <Text style={[styles.quantityBadge, { color: colors.text }]}>
                x{cartEntry.quantity}
              </Text>
            )}
          </View>
          <Text
            style={[styles.title, { color: colors.textDarker }]}
            numberOfLines={1}
          >
            {product.title}
          </Text>
          {(cartEntry.selectedSize || cartEntry.selectedColor) && (
            <View style={styles.variationRow}>
              {cartEntry.selectedSize && (
                <View style={styles.chip}>
                  <Text style={[styles.chipText, { color: colors.text }]}>
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
                  <Text style={[styles.chipText, { color: colors.text }]}>
                    {cartEntry.selectedColor}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.bottomRow}>
          <CurrencyDisplay
            value={product.priceInPoints * cartEntry.quantity}
            size="medium"
          />
          <TouchableOpacity
            onPress={() => onRemove && onRemove(product)}
            style={styles.removeButton}
          >
            <MaterialIcons
              name="delete-outlined"
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  quantityBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
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
    fontWeight: '600',
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
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
  },
  detailSubdiv: {
    width: '100%',
  },
});
