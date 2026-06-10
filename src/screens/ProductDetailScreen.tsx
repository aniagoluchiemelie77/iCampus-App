import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useAppDataContext } from '../components/EventContext';
import { PageHeader } from '../components/PageHeader';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from 'assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { formatTime } from '../utils/durationFormatter';
import { formatCount } from '../utils/followCountFormatter';
import { logProductImpressionAPI } from '../api/localPatchApis';
import { searchUsersByUid } from '../api/localGetApis';
import { UserIdentity } from '../components/UserIdentity';
import { ProductCard } from '../components/ProductCard';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';

export const ProductDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { productId } = route.params as { productId: string };
  const { allProducts, handleCartItemToggle, handleToggleFavorite } =
    useAppDataContext();
  const currentUser = useAppSelector(state => state.user);
  const product = allProducts.find(p => p.productId === productId);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(
    product?.physicalDetails?.colors?.[0],
  );
  const [selectedSize, setSelectedSize] = useState(
    product?.physicalDetails?.sizes?.[0],
  );
  const [quantity, setQuantity] = useState(1);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [seller, setSeller] = useState<any>(null);

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
      let nextIndex = activeImageIndex + 1;
      if (nextIndex >= product.mediaUrls.length) nextIndex = 0;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveImageIndex(nextIndex);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeImageIndex, product?.mediaUrls]);
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
  const moreProducts = allProducts
    .filter(p => p.sellerId === product.sellerId && p.productId !== productId)
    .slice(0, 10);
  const totalDuration =
    product?.courseDetails?.content?.reduce(
      (acc, item) => acc + (item.duration || 0),
      0,
    ) || 0;
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Product Detail" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.productImageDiv}>
          <FlatList
            ref={flatListRef}
            data={product.mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false },
            )}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.productImage} />
            )}
            keyExtractor={(_, index) => index.toString()}
          />
          <View
            style={[
              styles.pagination,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {product.mediaUrls.map((_, i) => (
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
        <View
          style={[
            styles.detailsContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.titleContainer}>
            <View>
              <Text style={[styles.title, { color: colors.textDarker }]}>
                {product.title}
              </Text>
              {product.description && (
                <Text style={[styles.description, { color: colors.text }]}>
                  {product.description}
                </Text>
              )}
            </View>
            <CurrencyDisplay value={product.priceInPoints} size="large" />
          </View>
          {product.type === 'physical' && product.physicalDetails?.colors && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select Color
              </Text>
              <View style={styles.optionsRow}>
                {product.physicalDetails.colors.map(color => (
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
          {product.type === 'physical' && product.physicalDetails?.sizes && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select Size
              </Text>
              <View style={styles.optionsRow}>
                {product.physicalDetails.sizes.map(size => (
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
          {product.type === 'course' && product.courseDetails && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Course Info
              </Text>
              <View style={styles.rowDiv}>
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="schedule-outlined"
                    size={22}
                    color={colors.text}
                  />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    Duration: {formatTime(totalDuration)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="people-outlined"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {formatCount(product.courseDetails.studentsEnrolled.length)}{' '}
                    Students Enrolled
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="star-outline"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {formatCount(product.courseDetails.totalReviews)} Reviews
                  </Text>
                </View>
              </View>
            </View>
          )}
          {product.type === 'file' && product.fileDetails && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                File Specifications
              </Text>
              <View style={styles.rowDiv}>
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="insert-drive-file-outlined"
                    size={20}
                    color={colors.text}
                  />
                  <Text style={[styles.infoText, { color: colors.text }]}>
                    {product.fileDetails.fileFormat.toUpperCase()} •{' '}
                    {product.fileDetails.fileSizeInMB} MB
                  </Text>
                </View>
              </View>
            </View>
          )}
          {product.type === 'physical' && (
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
                    [styles.qtyBtn, { borderColor: colors.primary }],
                    quantity >= product.amountInStock && styles.disabledBtn,
                  ]}
                >
                  <Text style={[styles.qtyBtnText, { color: colors.primary }]}>
                    +
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('SellerProducts', {
                    sellerId: product.sellerId,
                    seller: seller,
                  })
                }
                style={[styles.moreBtn, { backgroundColor: colors.btnColor }]}
              >
                <Text
                  style={[styles.moreBtnText, { color: colors.btnTextColor }]}
                >
                  See All
                </Text>
              </TouchableOpacity>
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
      </ScrollView>
      <View
        style={[styles.footer, { backgroundColor: colors.backgroundSecondary }]}
      >
        <View style={styles.footerSubDiv}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(product.productId)}
          >
            <MaterialIcons
              name={
                isFavorite ? 'favorite-outlined' : 'favorite-border-outlined'
              }
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
                name={'shopping-cart-outlined'}
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, { backgroundColor: colors.btnColor }]}
          onPress={() =>
            navigation.navigate('Checkout', {
              productId,
              quantity,
              color: selectedColor,
              size: selectedSize,
            })
          }
        >
          <Text style={[styles.btnText, { color: colors.btnTextColor }]}>
            Buy Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  dotContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -25,
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#49454F',
    marginTop: 24,
    marginBottom: 12,
  },

  // --- Selection Rows ---
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeRing: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.1 }],
  },
  sizeBox: {
    minWidth: 50,
    height: 45,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  activeSize: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sizeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },

  // --- Quantity Selector ---
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    alignSelf: 'flex-start',
    borderRadius: 15,
    padding: 4,
  },
  qtyVal: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    color: '#1A1C1E',
  },

  desc: {
    fontSize: 15,
    lineHeight: 24,
    color: '#60646C',
    marginTop: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 15,
    borderTopWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSubDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtn: {
    flex: 1,
    height: 54,
    borderRadius: 15,
    backgroundColor: '#1A1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buyBtn: {
    flex: 1.2, // Slightly wider than the cart button
    height: 54,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  detailsContainer: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 8,
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  sectionTitle2: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
  },
  selectedBorder: {
    borderWidth: 3,
    borderColor: PRIMARY_COLOR,
    transform: [{ scale: 1.1 }],
  },
  sizeOption: {
    width: 50,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    justifyContent: 'center',
    alignContent: 'center',
    backgroundColor: '#fadccc',
  },
  selectedSize: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  whiteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blackText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  qtyBtn: {
    padding: 15,
    borderRadius: 15,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  qtyBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 20,
  },
  description: {
    fontSize: 14,
    marginTop: 8,
  },
  productImageDiv: {
    marginBottom: 15,
    width: '100%',
    height: 450,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    right: 10,
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  checkoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoRow: {
    alignItems: 'center',
  },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoText: {
    marginTop: 5,
    fontSize: 14,
  },
  fileSubText: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  moreSection: {
    alignContent: 'center',
  },
  moreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 15,
  },
  moreBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
  },
  moreBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});