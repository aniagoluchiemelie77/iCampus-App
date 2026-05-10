import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useAppDataContext } from '../components/EventContext';
import {PageHeader} from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT, PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {CurrencyDisplay} from '../components/CurrencyFormatter';
import {formatTime} from '../utils/durationFormatter';
import {formatCount} from '../utils/followCountFormatter';
import { searchUsersByUid } from '../api/localGetApis';
import { UserIdentity } from '../components/UserIdentity';
import { ProductCard } from '../components/ProductCard';
const { width } = Dimensions.get('window');

export const ProductDetailScreen = () => {
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
  if (!product) return <Text>Product not found</Text>;
  const isFavorite = currentUser?.favorites?.includes(product.productId);
  const existingItem = currentUser?.cart?.find(
    item => item.productId === product.productId,
  );
  const isAlreadyInCart = !!existingItem;
  const moreProducts = allProducts
    .filter(p => p.sellerId === product.sellerId && p.productId !== productId)
    .slice(0, 10);
  return (
    <View style={styles.container}>
      <PageHeader title="Item Detail" />
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
          <View style={styles.pagination}>
            {product.mediaUrls.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, activeImageIndex === i && styles.activeDot]}
              />
            ))}
          </View>
        </View>
        <View style={styles.detailsContainer}>
          <View style={styles.titleContainer}>
            <View>
              <Text style={styles.title}>{product.title}</Text>
              {product.description && (
                <Text style={styles.description}>{product.description}</Text>
              )}
            </View>
            <View style={styles.priceDiv}>
              <CurrencyDisplay value={product.priceInPoints} size="large" />
            </View>
          </View>
          {product.type === 'physical' && product.physicalDetails?.colors && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Color</Text>
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
              <Text style={styles.sectionTitle}>Select Size</Text>
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
              <Text style={styles.sectionTitle}>Course Info</Text>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="schedule-outlined"
                  size={20}
                  color={PRIMARY_COLOR_TINT}
                />
                <Text style={styles.infoText}>
                  Duration: {formatTime(product.courseDetails.duration)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="people-outlined"
                  size={20}
                  color={PRIMARY_COLOR_TINT}
                />
                <Text style={styles.infoText}>
                  {formatCount(product.courseDetails.studentsEnrolledCount)}{' '}
                  Students Enrolled
                </Text>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons
                  name="star-outline"
                  size={20}
                  color={PRIMARY_COLOR_TINT}
                />
                <Text style={styles.infoText}>
                  {formatCount(product.courseDetails.totalReviews)} Reviews
                </Text>
              </View>
            </View>
          )}
          {product.type === 'file' && product.fileDetails && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>File Specifications</Text>
              <View style={styles.fileCard}>
                <MaterialIcons
                  name="insert-drive-file-outlined"
                  size={30}
                  color={PRIMARY_COLOR_TINT}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.fileSubText}>
                    {product.fileDetails.fileFormat.toUpperCase()} •{' '}
                    {product.fileDetails.fileSizeInMB} MB
                  </Text>
                </View>
                {product.fileDetails.hasPassword && (
                  <MaterialIcons
                    name="lock-outlined"
                    size={18}
                    color={PRIMARY_COLOR_TINT}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </View>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.sellerSection}>
          <Text style={styles.sectionTitle}>Seller Details</Text>
          <View style={styles.sellerRow}>
            <Image
              source={{
                uri: seller?.profilePic || 'https://via.placeholder.com/50',
              }}
              style={styles.sellerAvatar}
            />
            <UserIdentity
              firstname={seller?.firstname || 'Loading...'}
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
          <View style={styles.moreSection}>
            <View style={styles.moreHeader}>
              <Text style={styles.sectionTitle2}>More by this seller</Text>
              <TouchableOpacity
                //onPress={() => {}}
                style={styles.moreBtn}
              >
                <Text style={styles.moreBtnText}>See All</Text>
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
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(product.productId)}
          >
            <MaterialIcons
              name={
                isFavorite ? 'favorite-outlined' : 'favorite-border-outlined'
              }
              size={28}
              color={PRIMARY_COLOR}
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
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() =>
            navigation.navigate('Checkout', {
              productId,
              quantity,
              color: selectedColor,
              size: selectedSize,
            })
          }
        >
          <Text style={styles.btnText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroImage: {
    width: width,
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
    backgroundColor: PRIMARY_COLOR_TINT,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: PRIMARY_COLOR,
    width: 18,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    alignItems: 'center',
    gap: 12,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
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
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  sellerSection: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#fadccc',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderColor: PRIMARY_COLOR_TINT_MAIN,
    borderWidth: 1,
    marginRight: 4,
  },
  section: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitle2: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
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
    backgroundColor: '#fadccc',
    alignSelf: 'flex-start',
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 20,
    color: PRIMARY_COLOR,
  },
  description: {
    fontSize: 14,
    color: '#2222',
    marginTop: 7,
  },
  productImageDiv: {
    marginVertical: 10,
    width: width,
    height: 450,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pagination: {
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    right: 10,
    alignSelf: 'center',
    zIndex: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  priceDiv: {
    paddingHorizontal: 5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  checkoutBtn: {
    width: '100%',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignContent: 'center',
  },
  btnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2222',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    padding: 15,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
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
  },
  moreBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 13,
    alignContent: 'center',
  },
  moreBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});