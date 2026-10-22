import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppDataContext } from '../context/EventContext';
import { Product } from '../types/firebase';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { formatStatNumber } from '../utils/followCountFormatter';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { useConvertedPrice } from '../hooks/useCurrencyConverter';
import { LazyRotatingImages } from './LazyRotatingImages';
import Toast from 'react-native-toast-message';

export const ProductCard = ({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  const { handleToggleFavorite, handleCartItemToggle, currentUser } =
    useAppDataContext();
  // Hooks must run before any early return.
  const favScale = React.useRef(new Animated.Value(1)).current;
  const cartScale = React.useRef(new Animated.Value(1)).current;
  const buyerNationality = currentUser?.country || 'Nigeria';
  const { convertedValue } = useConvertedPrice(
    Number(product?.price) || 0,
    product?.nationalityOfSeller,
    buyerNationality,
  );

  const productId = product?.productId;
  const isFavorited =
    !!productId && Array.isArray(currentUser?.favorites)
      ? currentUser.favorites.includes(productId)
      : false;
  const isInCart =
    !!productId &&
    Array.isArray(currentUser?.cart) &&
    currentUser.cart.some(item => item?.productId === productId);

  const pulse = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, {
        toValue: 1.25,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleFavoritePress = useCallback(() => {
    if (!product) return;
    pulse(favScale);
    handleToggleFavorite(product.productId);
    Toast.show({
      type: isFavorited ? 'error' : 'success',
      text1: isFavorited ? 'Removed from favorites' : 'Added to favorites',
      position: 'bottom',
      visibilityTime: 2500,
      bottomOffset: 60,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleToggleFavorite, productId, isFavorited]);

  const handleCartPress = useCallback(() => {
    if (!product) return;
    pulse(cartScale);
    handleCartItemToggle(product);
    Toast.show({
      type: isInCart ? 'error' : 'success',
      text1: isInCart ? 'Removed from cart' : 'Added to cart',
      position: 'bottom',
      visibilityTime: 2500,
      bottomOffset: 60,
    });
  }, [handleCartItemToggle, product, isInCart]);

  if (!product) return null;

  // `ratings` may arrive as a raw JSON string from SQLite, including the
  // string "null" (JSON.parse gives null, and `.length` on it crashed the
  // "More by this seller" list). Always end up with an array.
  const rawRatings: any = product.ratings;
  let parsedRatings: any = rawRatings;
  if (typeof rawRatings === 'string') {
    try {
      parsedRatings = JSON.parse(rawRatings || '[]');
    } catch {
      parsedRatings = [];
    }
  }
  const ratings: any[] = Array.isArray(parsedRatings) ? parsedRatings : [];
  const avgRating =
    ratings.length > 0
      ? (
          ratings.reduce((acc, curr) => acc + (curr?.score || 0), 0) /
          ratings.length
        ).toFixed(1)
      : 'New';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.primaryTint,
          shadowColor: colors.text,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <LazyRotatingImages
          urls={product.mediaUrls}
          imageStyle={styles.thumbnail}
        />
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.typeText, { color: colors.primary }]}>
            {String(product.niche || 'ITEM').toUpperCase()}
          </Text>
        </View>
        {product.amountInStock === 0 && (
          <View
            style={[
              styles.soldOutOverlay,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.soldOutText, { color: colors.primary }]}>
              OUT OF STOCK
            </Text>
          </View>
        )}
        <View
          style={[
            styles.priceBadge,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <CurrencyDisplay value={convertedValue} size="small" />
        </View>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.textDarker }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {product.title || 'Untitled Product'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>{avgRating}</Text>
            <MaterialIcons name="star" size={14} color={colors.primary} />
          </View>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>
              {formatStatNumber(product.favCount || 0)}
            </Text>
            <MaterialIcons name="favorite" size={14} color={PRIMARY_COLOR} />
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={handleFavoritePress}>
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: favScale }] },
              ]}
            >
              <MaterialIcons
                name={isFavorited ? 'favorite' : 'favorite-border'}
                size={22}
                color={colors.primary}
                style={{ padding: 10 }}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCartPress}>
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: cartScale }] },
              ]}
            >
              <MaterialIcons
                name={isInCart ? 'shopping-cart' : 'add-shopping-cart'}
                size={20}
                color={colors.primary}
                style={{ padding: 10 }}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  info: { padding: 8 },
  title: { fontSize: 14, fontWeight: 'bold' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  iconContainer: {
    padding: 10,
  },
  card: {
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 0.8,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  typeBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceBadge: {
    position: 'absolute',
    right: 5,
    bottom: -7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  soldOutOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -6,
    right: 4,
    borderRadius: 10,
    padding: 10,
  },
  soldOutText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 6,
    gap: 10,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
  },
});
