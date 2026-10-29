import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import { useAppDataContext } from '../context/EventContext';
import { PageHeader } from '../components/PageHeader';
import { CustomButton } from '../assets/components/AppUIComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { logProductImpressionAPI } from '../api/localPatchApis';
import { UserIdentity } from '../components/UserIdentity';
import { ProductCard } from '../components/ProductCard';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';
import { StationCarousel } from '../components/StationCarousel.tsx';
import { useLocationServices } from '../hooks/useLocationService.ts';
import { queryProducts } from '../hooks/useSQLiteDb';
import { useUser } from '../hooks/useUserDetails.ts';
import { useConvertedPrice } from '../hooks/useCurrencyConverter';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { formatStatNumber } from '../utils/followCountFormatter';
import { ProductReviewsCarousel } from '../components/ProductReviewsCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESCRIPTION_LIMIT = 220;
const MORE_CARD_WIDTH = 168;

export const ProductDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { productId } = route.params as { productId: string };
  const { handleCartItemToggle, handleToggleFavorite, catalogSyncVersion } =
    useAppDataContext();
  const currentUser = useAppSelector(state => state.user) || {};
  const buyerNationality = currentUser?.country || 'Nigeria';
  const [focusRefreshKey, setFocusRefreshKey] = useState(0);

  // Parsed through parseProductRow (via queryProducts) so JSON columns such
  // as `ratings` are always arrays, never the string "null".
  const product = useMemo(() => {
    return queryProducts('SELECT * FROM products WHERE productId = ? LIMIT 1;', [productId])[0] ?? null;
    // `catalogSyncVersion` and `focusRefreshKey` are deliberate triggers: the
    // catalog sync is async, so the first render can legitimately miss the row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, catalogSyncVersion, focusRefreshKey]);

  useFocusEffect(
    useCallback(() => {
      setFocusRefreshKey(previous => previous + 1);
    }, []),
  );

  const mediaUrls: string[] = Array.isArray(product?.mediaUrls) ? product.mediaUrls : [];
  const details = product?.physicalDetails || {};
  const colorOptions: string[] = Array.isArray(details.colors) ? details.colors : [];
  const sizeOptions: string[] = Array.isArray(details.sizes) ? details.sizes : [];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colorOptions[0]);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(sizeOptions[0]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  // The row can arrive after the first render; pick defaults once it does.
  useEffect(() => {
    if (!selectedColor && colorOptions[0]) setSelectedColor(colorOptions[0]);
    if (!selectedSize && sizeOptions[0]) setSelectedSize(sizeOptions[0]);
  }, [colorOptions, sizeOptions, selectedColor, selectedSize]);

  const { userCoords } = useLocationServices();
  const { convertedValue } = useConvertedPrice(
    product?.price ?? 0,
    product?.nationalityOfSeller ?? 'Nigeria',
    buyerNationality,
  );
  const [quantity, setQuantity] = useState(1);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const moreProducts = useMemo(() => {
    if (!product?.sellerId) return [];
    return queryProducts(
      'SELECT * FROM products WHERE sellerId = ? AND productId != ? LIMIT 10;',
      [product.sellerId, productId],
    );
  }, [product?.sellerId, productId]);
  const { user: seller } = useUser(product?.sellerId);

  useEffect(() => {
    if (mediaUrls.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % mediaUrls.length;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [mediaUrls.length]);

  useEffect(() => {
    if (productId) logProductImpressionAPI(productId);
  }, [productId]);

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title="Product Detail" />
        <EmptyState
          iconName="inventory-2"
          title="Product unavailable"
          subtitle="This listing may have been removed, or it hasn't synced to your device yet."
          buttonText="Go back"
          buttonIcon="arrow-back"
          onPress={() => navigation.goBack()}
          secondaryButtonText="Try again"
          onSecondaryPress={() => setFocusRefreshKey(k => k + 1)}
        />
      </View>
    );
  }

  const isFavorite = Array.isArray(currentUser?.favorites) && currentUser.favorites.includes(product.productId);
  const isAlreadyInCart =
    Array.isArray(currentUser?.cart) &&
    currentUser.cart.some((item: any) => item?.productId === product.productId);
  const gateways: string[] = Array.isArray(details.sellerGateways) ? details.sellerGateways : [];
  const hasHome = gateways.includes('home_delivery');
  const stations: any[] = Array.isArray(details.dropOffAddress) ? details.dropOffAddress : [];
  const hasDropOff = stations.length > 0;
  const isOnlyDropOff = !hasHome && hasDropOff;
  const stock = Number(product.amountInStock) || 0;
  const isOutOfStock = stock <= 0;
  const ratings: any[] = Array.isArray(product.ratings) ? product.ratings : [];
  const avgRating = ratings.length
    ? (ratings.reduce((sum, r) => sum + (Number(r?.score) || 0), 0) / ratings.length).toFixed(1)
    : null;
  const description: string = product.description || '';
  const isLongDescription = description.length > DESCRIPTION_LIMIT;
  const stockColor = isOutOfStock ? colors.primary : stock < 5 ? colors.pendingDelivery : colors.success;

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

  const sellerName =
    seller?.usertype === 'enterprise'
      ? seller?.organizationName
      : [seller?.firstname, seller?.lastname].filter(Boolean).join(' ');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Product Detail" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.productImageDiv}>
          <FlatList
            ref={flatListRef}
            data={mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
                <Image source={{ uri: item }} style={styles.productImage} />
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
          />
          <View
            style={[
              styles.pagination,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {mediaUrls.map((item: string, i: number) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  activeImageIndex === i
                    ? { width: 18, backgroundColor: colors.primary }
                    : { backgroundColor: colors.primaryTint },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.chipRow}>
            {!!product.niche && (
              <View style={[styles.chip, { backgroundColor: colors.primary + '1A' }]}>
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {String(product.niche).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.chip, { backgroundColor: stockColor + '1A' }]}>
              <MaterialIcons name="inventory-2" size={12} color={stockColor} />
              <Text style={[styles.chipText, { color: stockColor }]}>
                {isOutOfStock ? 'Out of stock' : stock < 5 ? `Only ${stock} left` : 'In stock'}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textDarker }]}>{product.title}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <MaterialIcons name="star" size={16} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textDarker }]}>
                {avgRating ?? 'New'}
              </Text>
              {ratings.length > 0 && (
                <Text style={[styles.statMuted, { color: colors.text }]}>
                  ({formatStatNumber(ratings.length)})
                </Text>
              )}
            </View>
            <View style={[styles.statDot, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <MaterialIcons name="favorite" size={15} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textDarker }]}>
                {formatStatNumber(Number(product.favCount) || 0)}
              </Text>
            </View>
            {Number(product.sales) > 0 && (
              <>
                <View style={[styles.statDot, { backgroundColor: colors.border }]} />
                <Text style={[styles.statMuted, { color: colors.text }]}>
                  {formatStatNumber(Number(product.sales))} sold
                </Text>
              </>
            )}
          </View>

          <View style={[styles.priceBlock, { borderColor: colors.border + '66' }]}>
            <Text style={[styles.priceLabel, { color: colors.text }]}>Price</Text>
            <CurrencyDisplay value={convertedValue} size="large" />
          </View>

          {!!description && (
            <View style={styles.descriptionBlock}>
              <Text style={[styles.blockTitle, { color: colors.textDarker }]}>About this item</Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {isLongDescription && !descriptionExpanded
                  ? `${description.slice(0, DESCRIPTION_LIMIT).trimEnd()}…`
                  : description}
              </Text>
              {isLongDescription && (
                <Text
                  style={[styles.readMore, { color: colors.primary }]}
                  onPress={() => setDescriptionExpanded(v => !v)}
                >
                  {descriptionExpanded ? 'Show less' : 'Read more'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Options */}
        {(colorOptions.length > 0 || sizeOptions.length > 0 || !isOutOfStock) && (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            {colorOptions.length > 0 && (
              <View style={styles.optionBlock}>
                <Text style={[styles.blockTitle, { color: colors.textDarker }]}>
                  Color
                  {!!selectedColor && (
                    <Text style={[styles.selectedLabel, { color: colors.text }]}>  ·  {selectedColor}</Text>
                  )}
                </Text>
                <View style={styles.optionsRow}>
                  {colorOptions.map(color => {
                    const selected = selectedColor === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        onPress={() => setSelectedColor(color)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={color}
                        style={[
                          styles.swatchRing,
                          { borderColor: selected ? colors.primary : 'transparent' },
                        ]}
                      >
                        <View
                          style={[
                            styles.swatch,
                            { backgroundColor: color.toLowerCase(), borderColor: colors.border },
                          ]}
                        >
                          {selected && <MaterialIcons name="check" size={16} color="#fff" style={styles.swatchCheck} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {sizeOptions.length > 0 && (
              <View style={styles.optionBlock}>
                <Text style={[styles.blockTitle, { color: colors.textDarker }]}>Size</Text>
                <View style={styles.optionsRow}>
                  {sizeOptions.map(size => {
                    const selected = selectedSize === size;
                    return (
                      <TouchableOpacity
                        key={size}
                        onPress={() => setSelectedSize(size)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={[
                          styles.sizeOption,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary : colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sizeText,
                            { color: selected ? colors.btnTextColor : colors.textDarker },
                          ]}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {!isOutOfStock && (
              <View style={[styles.optionBlock, styles.quantityBlock]}>
                <View>
                  <Text style={[styles.blockTitle, { color: colors.textDarker, marginBottom: 2 }]}>
                    Quantity
                  </Text>
                  <Text style={[styles.statMuted, { color: colors.text }]}>{stock} available</Text>
                </View>
                <View style={[styles.stepper, { backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    style={[styles.stepBtn, quantity <= 1 && styles.disabledBtn]}
                    accessibilityLabel="Decrease quantity"
                  >
                    <MaterialIcons name="remove" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyText, { color: colors.textDarker }]}>{quantity}</Text>
                  <TouchableOpacity
                    onPress={() => setQuantity(q => Math.min(stock, q + 1))}
                    disabled={quantity >= stock}
                    style={[styles.stepBtn, quantity >= stock && styles.disabledBtn]}
                    accessibilityLabel="Increase quantity"
                  >
                    <MaterialIcons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Delivery */}
        {(hasHome || hasDropOff) && (
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.blockTitle, { color: colors.textDarker }]}>Delivery options</Text>
            {hasHome && (
              <View style={styles.deliveryRow}>
                <View style={[styles.deliveryIcon, { backgroundColor: colors.primary + '1A' }]}>
                  <MaterialIcons name="local-shipping" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deliveryTitle, { color: colors.textDarker }]}>Home delivery</Text>
                  <Text style={[styles.statMuted, { color: colors.text }]}>
                    The seller delivers to your address.
                  </Text>
                </View>
              </View>
            )}
            {hasDropOff && (
              <View style={styles.deliveryRow}>
                <View style={[styles.deliveryIcon, { backgroundColor: colors.primary + '1A' }]}>
                  <MaterialIcons name="storefront" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deliveryTitle, { color: colors.textDarker }]}>Pick up at a station</Text>
                  <Text style={[styles.statMuted, { color: colors.text }]}>
                    {stations.length} drop-off {stations.length === 1 ? 'station' : 'stations'}
                    {isOnlyDropOff ? ' · pickup only' : ''}
                  </Text>
                </View>
              </View>
            )}
            {hasDropOff && (
              <View style={styles.stationsWrap}>
                <StationCarousel stations={stations} userCoords={userCoords} />
              </View>
            )}
          </View>
        )}

        {/* Seller */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!product.sellerId}
          onPress={() => navigation.navigate('Profile', { identifier: product.sellerId })}
          style={[styles.card, styles.sellerCard, { backgroundColor: colors.backgroundSecondary }]}
          accessibilityRole="button"
          accessibilityLabel={`Seller ${sellerName || ''}. Open profile`}
        >
          <UserAvatar
            profilePic={seller?.profilePic}
            firstName={seller?.firstname || 'Merchant'}
            lastName={seller?.lastname}
            organizationName={seller?.organizationName}
            style={styles.sellerAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.sellerLabel, { color: colors.text }]}>Sold by</Text>
            <UserIdentity
              firstname={seller?.firstname || 'Merchant'}
              lastname={seller?.lastname}
              username={seller?.username}
              tier={seller?.tier === 'pro' || seller?.tier === 'premium' ? seller.tier : 'free'}
              isVerified={seller?.isVerified}
              isOrganization={seller?.usertype === 'enterprise'}
              organizationName={seller?.organizationName}
              size="medium"
              containerStyle={styles.sellerIdentity}
            />
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Reviews */}
        <ProductReviewsCarousel productId={productId} />

        {/* More by this seller */}
        {moreProducts.length > 0 && (
          <View style={styles.moreSection}>
            <View style={styles.moreHeader}>
              <Text style={[styles.sectionHeading, { color: colors.textDarker }]}>
                More from this seller
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SellerProducts', { sellerId: product.sellerId, seller })
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.seeAll}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={moreProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.productId}
              contentContainerStyle={styles.moreList}
              renderItem={({ item }) => (
                // Fixed width: ProductCard is 100% wide, which is undefined
                // inside a horizontal list.
                <View style={styles.moreCard}>
                  <ProductCard
                    product={item}
                    onPress={() => navigation.push('ProductDetails', { productId: item.productId })}
                  />
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
      <View
        style={[styles.footer, { backgroundColor: colors.backgroundSecondary }]}
      >
        <View style={styles.footerSubDiv}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(product.productId)}
          >
            <MaterialIcons
              name={isFavorite ? 'favorite' : 'favorite-border'}
              size={28}
              color={colors.primary}
            />
          </TouchableOpacity>
          {!isAlreadyInCart && (
            <TouchableOpacity
              style={{ marginLeft: 4 }}
              onPress={() =>
                handleCartItemToggle(product, selectedSize, selectedColor)
              }
            >
              <MaterialIcons
                name={'shopping-cart'}
                size={28}
                color={colors.primary}
                style={{ padding: 10 }}
              />
            </TouchableOpacity>
          )}
        </View>
        <CustomButton
          title="Buy Now"
          style={styles.checkoutBtn}
          onPress={() =>
            navigation.navigate('Checkout', {
              productId,
              quantity,
              color: selectedColor,
              size: selectedSize,
            })
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 15,
    paddingBottom: 120,
  },
  // --- Carousel (unchanged) ---
  productImageDiv: {
    marginBottom: 15,
    width: SCREEN_WIDTH - 30,
    height: 350,
    borderRadius: 15,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  productImage: {
    width: SCREEN_WIDTH - 30,
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 15,
    right: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  // --- Details ---
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13.5, fontWeight: '700' },
  statMuted: { fontSize: 12.5, opacity: 0.75 },
  statDot: { width: 4, height: 4, borderRadius: 2 },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceLabel: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  descriptionBlock: { marginTop: 16 },
  blockTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 8 },
  selectedLabel: { fontSize: 13, fontWeight: '500' },
  description: { fontSize: 14, lineHeight: 21 },
  readMore: { fontSize: 13.5, fontWeight: '700', marginTop: 6 },
  optionBlock: { marginBottom: 16 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchRing: { padding: 3, borderRadius: 22, borderWidth: 2 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
  sizeOption: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeText: { fontSize: 13, fontWeight: '700' },
  quantityBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, padding: 4 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '800', minWidth: 34, textAlign: 'center' },
  disabledBtn: { opacity: 0.35 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  deliveryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deliveryTitle: { fontSize: 14, fontWeight: '700' },
  stationsWrap: { marginTop: 4 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24 },
  sellerLabel: { fontSize: 11.5, fontWeight: '600', opacity: 0.7, marginBottom: 2 },
  sellerIdentity: { backgroundColor: 'transparent' },
  moreSection: { marginTop: 6, marginBottom: 12 },
  moreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: { fontSize: 16, fontWeight: '800' },
  seeAll: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { fontSize: 13.5, fontWeight: '700' },
  moreList: { gap: 12, paddingRight: 4 },
  moreCard: { width: MORE_CARD_WIDTH },
  // --- Footer (unchanged) ---
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
  },
  footerSubDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutBtn: {
    paddingHorizontal: 20,
    width: 'auto',
  },
});
