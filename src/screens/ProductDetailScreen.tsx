import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { searchUsersByUid } from '../api/localGetApis';
import { UserIdentity } from '../components/UserIdentity';
import { ProductCard } from '../components/ProductCard';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';
import { StationCarousel } from '../components/StationCarousel.tsx';
import { useLocationServices } from '../hooks/useLocationService.ts';
import { db } from '../hooks/useSQLiteDb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ProductDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { productId } = route.params as { productId: string };
  const { handleCartItemToggle, handleToggleFavorite } = useAppDataContext();
  const currentUser = useAppSelector(state => state.user) || {};
  const getProductById = (productId: string) => {
    const queryResult = db.execute(
      'SELECT * FROM products WHERE productId = ?;',
      [productId],
    );

    if (queryResult.rows && queryResult.rows.length > 0) {
      const rawProduct = queryResult.rows.item(0);
      return {
        ...rawProduct,
        mediaUrls: JSON.parse(rawProduct.mediaUrls || '[]'),
        physicalDetails: JSON.parse(rawProduct.physicalDetails || '{}'),
      };
    }
    return null;
  };
  const product = useMemo(() => {
    return getProductById(productId);
  }, [productId]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(
    product?.physicalDetails?.colors?.[0],
  );
  const [selectedSize, setSelectedSize] = useState(
    product?.physicalDetails?.sizes?.[0],
  );
  const { userCoords } = useLocationServices();
  const [quantity, setQuantity] = useState(1);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [seller, setSeller] = useState<any>(null);

  const getProductsBySeller = (sellerId: string, excludeProductId: string) => {
    const queryResult = db.execute(
      'SELECT * FROM products WHERE sellerId = ? AND productId != ? LIMIT 10;',
      [sellerId, excludeProductId],
    );

    const products = [];
    const rows = queryResult?.rows;

    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        const item = rows.item(i);
        products.push({
          ...item,
          mediaUrls: JSON.parse(item.mediaUrls || '[]'),
          physicalDetails: JSON.parse(item.physicalDetails || '{}'),
        });
      }
    }
    return products;
  };
  const moreProducts = useMemo(() => {
    if (!product || !product.sellerId) return [];
    return getProductsBySeller(product.sellerId, productId);
  }, [product, productId]);

  useEffect(() => {
    const fetchSeller = async () => {
      if (product?.sellerId) {
        const data = await searchUsersByUid(
          product.sellerId,
          currentUser.tier!,
          currentUser.usertype!,
        );
        if (data && data.length > 0) {
          setSeller(data[0]);
        }
      }
    };
    fetchSeller();
  }, [product?.sellerId, currentUser?.tier, currentUser?.usertype]);
  useEffect(() => {
    if (!product?.mediaUrls || product.mediaUrls.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex(prevIndex => {
        const nextIndex = (prevIndex + 1) % product.mediaUrls.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [product?.mediaUrls]);

  useEffect(() => {
    const incrementView = async () => {
      logProductImpressionAPI(productId);
    };
    if (productId) {
      incrementView();
    }
  }, [productId]);

  if (!product) return <Text>Product not found</Text>;

  const isFavorite = currentUser?.favorites?.includes(product.productId);
  const existingItem = currentUser?.cart?.find(
    item => item.productId === product.productId,
  );
  const isAlreadyInCart = !!existingItem;
  const gateways = product?.physicalDetails?.sellerGateways || [];
  const hasHome = gateways.includes('home_delivery');
  const stations = product?.physicalDetails?.dropOffAddress || [];
  const hasDropOff = stations.length > 0;
  const isOnlyDropOff = !hasHome && hasDropOff;

  const handleMomentumScrollEnd = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

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
            data={product.mediaUrls}
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
            {product.mediaUrls.map((item: string, i: number) => (
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

        <View style={styles.innerContainer}>
          <View
            style={[
              styles.detailsContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.titleContainer}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.title, { color: colors.textDarker }]}>
                  {product.title}
                </Text>
                {product.description && (
                  <Text style={[styles.description, { color: colors.text }]}>
                    {product.description}
                  </Text>
                )}
              </View>
              <CurrencyDisplay value={product.price} size="large" />
            </View>

            {product.physicalDetails?.colors && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Select Color
                </Text>
                <View style={styles.optionsRow}>
                  {product.physicalDetails.colors.map((color: string) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color.toLowerCase() },
                        selectedColor === color && styles.selectedBorder,
                      ]}
                      onPress={() => setSelectedColor(color)}
                    />
                  ))}
                </View>
              </View>
            )}

            {product.physicalDetails?.sizes && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Select Size
                </Text>
                <View style={styles.optionsRow}>
                  {product.physicalDetails.sizes.map((size: string) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeOption,
                        selectedSize === size && styles.selectedSize,
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text
                        style={
                          selectedSize === size
                            ? styles.whiteText
                            : styles.blackText
                        }
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Quantity
              </Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={[styles.qtyBtn, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.qtyBtnText, { color: colors.primary }]}>
                    -
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.qtyText, { color: colors.text }]}>
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (quantity < product.amountInStock) {
                      setQuantity(quantity + 1);
                    }
                  }}
                  disabled={quantity >= product.amountInStock}
                  style={[
                    styles.qtyBtn,
                    { borderColor: colors.primary },
                    quantity >= product.amountInStock && styles.disabledBtn,
                  ]}
                >
                  <Text style={[styles.qtyBtnText, { color: colors.primary }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
              {(hasHome || isOnlyDropOff) && stations.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Available Drop-off (Pickup) Stations
                  </Text>
                  <StationCarousel
                    stations={stations}
                    userCoords={userCoords}
                  />
                </View>
              )}
            </View>
          </View>

          <View
            style={[
              styles.sellerSection,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Seller Details
            </Text>
            <View style={styles.sellerRow}>
              <UserAvatar
                profilePic={seller?.profilePic}
                firstName={seller?.firstname || 'Merchant'}
                lastName={seller?.lastname}
                organizationName={seller?.organizationName}
                style={styles.sellerAvatar}
              />
              <UserIdentity
                firstname={seller?.firstname || 'Merchant'}
                lastname={seller?.lastname}
                username={seller?.username}
                tier={seller?.tier}
                isVerified={seller?.isVerified}
                isOrganization={seller?.usertype === 'enterprise'}
                organizationName={seller?.organizationName}
                size="medium"
              />
            </View>
          </View>

          {moreProducts.length > 0 && (
            <View
              style={[
                styles.moreSection,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={styles.moreHeader}>
                <Text style={[styles.sectionTitle2, { color: colors.text }]}>
                  More by this seller
                </Text>
                <CustomButton
                  title="See All"
                  onPress={() =>
                    navigation.navigate('SellerProducts', {
                      sellerId: product.sellerId,
                      seller: seller,
                    })
                  }
                  style={styles.moreBtn}
                />
              </View>
              <FlatList
                data={moreProducts}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.productId}
                renderItem={({ item }) => (
                  <ProductCard
                    product={item}
                    onPress={() =>
                      navigation.push('ProductDetails', {
                        productId: item.productId,
                      })
                    }
                  />
                )}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer / Action Bar */}
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
  innerContainer: {
    marginTop: 10,
  },
  productImageDiv: {
    marginBottom: 15,
    width: SCREEN_WIDTH - 30, // Accounting for horizontal padding
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
  detailsContainer: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionTitle2: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedBorder: {
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ scale: 1.1 }],
  },
  sizeOption: {
    minWidth: 45,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedSize: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  whiteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  blackText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 15,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  sellerSection: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  moreSection: {
    paddingBottom: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  moreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 15,
  },
  moreBtn: {
    paddingHorizontal: 12,
    height: 32,
  },
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
  },
});
