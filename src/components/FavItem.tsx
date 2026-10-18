import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Product } from '../types/firebase';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { withAlpha, PRIMARY_COLOR } from '../assets/styles/colors';
import {
  ProductMedia,
  NichePill,
  RoundIconButton,
  usePressScale,
  useResponsiveCardLayout,
  cardShadow,
  ProductListItemTokens,
} from './ProductListItem';

interface FavItemProps {
  product: Product;
  onRemove: (product: Product) => void;
}

export const FavItem: React.FC<FavItemProps> = ({ product, onRemove }) => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();
  const { cardWidth, isStacked: isNarrow } = useResponsiveCardLayout(2);

  const imageUri = product?.mediaUrls?.[0];
  const unitPrice = Number(product?.price) || 0;

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
          {isNarrow ? (
            <View style={styles.mediaTopLeft}>
              <View style={styles.pillOnMedia}>
                <Text style={styles.pillOnMediaText}>
                  {(product.niche || 'Item').toUpperCase()}
                </Text>
              </View>
            </View>
          ) : null}
        </ProductMedia>

        <View style={[styles.body, isNarrow && styles.bodyStacked]}>
          {!isNarrow && <NichePill label={product.niche} />}

          <Text
            style={[styles.title, { color: colors.textDarker }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {product.title}
          </Text>

          <View style={styles.footer}>
            <CurrencyDisplay value={unitPrice} size="small" />
            <RoundIconButton
              iconName="delete-outline"
              onPress={() => onRemove(product)}
              accessibilityLabel="Remove from favorites"
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
    height: 122,
    borderTopLeftRadius: ProductListItemTokens.radius,
    borderTopRightRadius: ProductListItemTokens.radius,
  },
  mediaTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  pillOnMedia: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pillOnMediaText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: '#FFFFFF',
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
