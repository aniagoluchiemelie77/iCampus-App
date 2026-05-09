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
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from 'assets/styles/colors';
import { formatStatNumber } from '../utils/followCountFormatter';

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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <AnimatedThumbnail urls={product.mediaUrls} />
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{product.category.toUpperCase()}</Text>
        </View>
        {!product.isAvailable && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Ratings & FavCount Row */}
        <View style={styles.statsRow}>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>{avgRating}</Text>
            <MaterialIcons name="star" size={14} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.inlineStat}>
            <Text style={styles.statText}>
              {formatStatNumber(product.favCount)}
            </Text>
            <MaterialIcons name="favorite" size={14} color={PRIMARY_COLOR} />
          </View>
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <MaterialIcons name="diamond" size={16} color={PRIMARY_COLOR} />
          <Text style={styles.priceText}>
            {product.priceInPoints.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </Text>
        </View>

        {/* 3. Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(product.productId)}
            style={[styles.iconBtn, isFavorited && styles.iconBtnSelected]}
          >
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={22}
              color={isFavorited ? '#fff' : PRIMARY_COLOR}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCartItemToggle(product)}
            style={[styles.iconBtn, isInCart && styles.iconBtnSelected]}
          >
            <MaterialIcons
              name={isInCart ? 'shopping-cart' : 'add-shopping-cart'}
              size={20}
              color={isInCart ? '#fff' : PRIMARY_COLOR}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  info: { padding: 8 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  priceText: {
    fontWeight: '700',
    marginLeft: 4,
    color: PRIMARY_COLOR,
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  iconBtn: { padding: 4 },
  iconBtnSelected: {
    backgroundColor: PRIMARY_COLOR,
  },
  card: {
    backgroundColor: '#fadccc',
    borderRadius: 16,
    width: '47%',
    margin: '1.5%',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    top: 8,
    left: 8,
    backgroundColor: 'rgba(43, 42, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    alignContent: 'center',
    position: 'absolute',
    bottom: 3,
    left: 3,
  },
  soldOutText: {
    color: PRIMARY_COLOR,
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
