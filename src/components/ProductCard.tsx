import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppDataContext } from './EventContext';
import { Product } from '../types/firebase';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { formatStatNumber } from '../utils/followCountFormatter';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';

const AnimatedThumbnail = ({ urls }: { urls: string[] }) => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (urls.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setIndex(prevIndex => (prevIndex + 1) % urls.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [urls, fadeAnim]);

  return (
    <Animated.Image
      source={{ uri: urls[index] }}
      style={[styles.thumbnail, { opacity: fadeAnim }]}
    />
  );
};
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
  const isFavorited =
    currentUser?.favorites?.includes(product.productId) ?? false;
  const cartItem = currentUser?.cart?.find(
    item => item.productId === product.productId,
  );
  const isInCart = !!cartItem;
  const avgRating =
    product.ratings.length > 0
      ? (
          product.ratings.reduce((acc, curr) => acc + curr.score, 0) /
          product.ratings.length
        ).toFixed(1)
      : 'New';
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.text,
          shadowColor: colors.text,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <AnimatedThumbnail urls={product.mediaUrls} />
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.typeText, { color: colors.primary }]}>
            {product.niche?.toUpperCase()}
          </Text>
        </View>
        {!product.isAvailable && (
          <View
            style={[
              styles.soldOutOverlay,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.soldOutText, { color: colors.text }]}>
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
          <CurrencyDisplay value={product.priceInPoints} size="small" />
        </View>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: colors.textDarker }]}
          numberOfLines={2}
        >
          {product.title}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>{avgRating}</Text>
            <MaterialIcons name="star" size={14} color={colors.primary} />
          </View>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>
              {formatStatNumber(product.favCount)}
            </Text>
            <MaterialIcons name="favorite" size={14} color={PRIMARY_COLOR} />
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(product.productId)}
          >
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleCartItemToggle(product)}>
            <MaterialIcons
              name={isInCart ? 'shopping-cart' : 'add-shopping-cart'}
              size={20}
              color={colors.primary}
            />
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
  card: {
    borderRadius: 16,
    width: '47%',
    margin: '1.5%',
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
    ...StyleSheet.absoluteFillObject,
    alignContent: 'center',
    position: 'absolute',
    top: 3,
    right: 3,
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
