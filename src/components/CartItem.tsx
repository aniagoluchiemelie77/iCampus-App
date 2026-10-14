import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Product, CartItem as CartItemType } from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { withAlpha, PRIMARY_COLOR } from '../assets/styles/colors';
import {
  ProductMedia,
  NichePill,
  VariantChip,
  RoundIconButton,
  usePressScale,
  useResponsiveCardLayout,
  cardShadow,
  ProductListItemTokens,
} from './ProductListItem';

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
  const { scale, onPressIn, onPressOut } = usePressScale();
  const { cardWidth, isStacked: isNarrow } = useResponsiveCardLayout(1);

  const imageUri = product?.mediaUrls?.[0];
  const unitPrice = Number(product?.price) || 0;
  const lineQuantity = cartEntry?.quantity ?? 1;
  const hasSize = Boolean(cartEntry?.selectedSize);
  const hasColor = Boolean(cartEntry?.selectedColor);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() =>
          navigation.navigate('ProductDetails', {
            productId: product.productId,
          })
        }
        style={[
          styles.card,
          { width: cardWidth },
          isNarrow ? styles.cardStacked : styles.cardRow,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: withAlpha(PRIMARY_COLOR, 0.14),
          },
          cardShadow(colors.text),
        ]}
      >
        <ProductMedia
          uri={imageUri}
          style={isNarrow ? styles.mediaStacked : styles.mediaRow}
        >
          {lineQuantity > 1 ? (
            <View style={styles.qtyOverlay}>
              <Text style={styles.qtyOverlayText}>x{lineQuantity}</Text>
            </View>
          ) : null}
        </ProductMedia>

        <View style={[styles.body, isNarrow && styles.bodyStacked]}>
          <NichePill label={product.niche} />

          <Text
            style={[styles.title, { color: colors.textDarker }]}
            numberOfLines={isNarrow ? 2 : 1}
          >
            {product.title}
          </Text>

          {hasSize || hasColor ? (
            <View style={styles.variantRow}>
              {hasSize ? (
                <VariantChip>Size {cartEntry.selectedSize}</VariantChip>
              ) : null}
              {hasColor ? (
                <VariantChip
                  accentColor={String(cartEntry.selectedColor).toLowerCase()}
                >
                  {cartEntry.selectedColor}
                </VariantChip>
              ) : null}
            </View>
          ) : null}

          <View style={styles.footer}>
            <CurrencyDisplay value={unitPrice * lineQuantity} size="medium" />
            <RoundIconButton
              iconName="delete-outline"
              onPress={() => onRemove && onRemove(product)}
              accessibilityLabel="Remove from cart"
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: ProductListItemTokens.radius,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  cardStacked: {
    padding: 0,
  },
  mediaRow: {
    width: ProductListItemTokens.mediaSize,
    height: ProductListItemTokens.mediaSize,
    borderRadius: ProductListItemTokens.mediaRadius,
  },
  mediaStacked: {
    width: '100%',
    height: 132,
    borderTopLeftRadius: ProductListItemTokens.radius,
    borderTopRightRadius: ProductListItemTokens.radius,
  },
  qtyOverlay: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  qtyOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    marginLeft: ProductListItemTokens.gap,
    justifyContent: 'space-between',
  },
  bodyStacked: {
    marginLeft: 0,
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
