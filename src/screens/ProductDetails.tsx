import React, { useRef, useState, useEffect } from 'react';

import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { Product, User } from '../types/firebase';
import {
  CalendarScreenStyles,
  ProductDetailsStyles,
  HomeScreenComponentStyles,
} from '../assets/styles/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
const { width } = Dimensions.get('window');
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { RootState } from '../components/store';

import { addToCart } from '../components/CartProductsSlice';
import { useDispatch } from 'react-redux';

type RouteParams = {
  ProductDetails: {
    product: Product;
  };
};
export type HeaderProps = {
  title: string;
  onBack: () => void;
};
type NavigationProp = StackNavigationProp<RootStackParamList>;
const CustomHeader: React.FC<HeaderProps> = ({ title, onBack }) => {
  return (
    <View style={CalendarScreenStyles.headerContainer}>
      <TouchableOpacity
        onPress={onBack}
        style={CalendarScreenStyles.backButton}
      >
        <Icon name="arrow-back-outline" size={25} color="#f54b02" />
        <Text style={CalendarScreenStyles.headerTitle}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
};
const ProductDetails = () => {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation();
  const navigation2 = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const route = useRoute<RouteProp<RouteParams, 'ProductDetails'>>();
  const { product } = route.params;
  const cartProductIds = useSelector((state: RootState) =>
    state.cart.items.map(item => item.productId),
  );
  const inCart = cartProductIds.includes(product.productId);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0;
  const [seller, setSeller] = useState<User | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);

  const formatDownloadCount = (count: number): string => {
    if (count >= 10000) return '10K+';
    if (count >= 100000) return '100K+';
    if (count >= 1000000) return '1M+';
    if (count >= 10000000) return '10M+';
    if (count >= 100000000) return '100M+';
    if (count >= 1000000000) return '1B+';
    if (count >= 1000) return '1K+';
    if (count >= 100) return '100+';
    return count.toString();
  };
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [otherProducts2, setOtherProducts2] = useState<Product[]>([]);
  const [loadingOthers, setLoadingOthers] = useState(true);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(null);
  const limit = 10;
  const fetchMoreProducts = async () => {
    setLoadingMore(true);
    if (
      !user?.schoolName ||
      loadingMore ||
      otherProducts2.length >= totalProducts!
    )
      return;
    const encodedSchool = encodeURIComponent(user.schoolName);

    try {
      const res = await fetch(
        `http://192.168.1.98:5000/store/products?schoolName=${encodedSchool}&category=all&limit=${limit}&offset=${offset}`,
      );
      const data = await res.json();
      setOtherProducts2(prev => [...prev, ...data.products]);
      setOffset(prev => prev + limit);
    } catch (err) {
      console.error('Error fetching more products:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  const handleAddToCart = async (cartItem: Product) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch('http://192.168.1.98:5000/store/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: cartItem.productId }), // or cartItem._id
      });

      if (res.ok) {
        dispatch(
          addToCart({
            ...cartItem,
            quantity: 1,
            selectedSize: selectedSize ?? undefined,
            selectedColor: selectedColor ?? undefined,
          }),
        );
        Toast.show({
          type: 'success',
          text1: 'Product successfully added to cart',
          position: 'bottom',
          bottomOffset: 10,
        });
        setRefreshFlag(prev => !prev);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to add to cart',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to add to cart',
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };

  //Fetch Seller Details
  useEffect(() => {
    const fetchSeller = async () => {
      try {
        const res = await fetch(
          `http://192.168.1.98:5000/store/products/${product.sellerId}`,
        );
        const data = await res.json();
        setSeller(data);
      } catch (err) {
        console.error('Failed to fetch seller:', err);
      } finally {
        setLoadingSeller(false);
      }
    };

    if (product?.sellerId) {
      fetchSeller();
    }
  }, [product.sellerId]);

  // Auto-scroll every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (product.mediaUrls.length > 1) {
        const nextIndex = (currentIndex + 1) % product.mediaUrls.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        setCurrentIndex(nextIndex);
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [currentIndex, product.mediaUrls.length]);

  //Fetch Other products By Seller
  useEffect(() => {
    const fetchOtherProducts = async () => {
      try {
        const res = await fetch(
          'http://192.168.1.98:5000/store/products/otherProductsBySeller',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sellerId: product.sellerId,
              excludeProductId: product.productId,
            }),
          },
        );

        const data = await res.json();
        setOtherProducts(data.products || []);
      } catch (err) {
        console.error('Failed to fetch other products:', err);
      } finally {
        setLoadingOthers(false);
      }
    };

    if (product?.sellerId && product?.productId) {
      fetchOtherProducts();
    }
  }, [product.sellerId, product.productId, product]);

  //Fetch Other random products
  useEffect(() => {
    if (!user?.schoolName) return;

    const encodedSchool = encodeURIComponent(user.schoolName);

    const loadInitialProducts = async () => {
      setLoadingMore(true);
      try {
        const res = await fetch(
          `http://192.168.1.98:5000/store/products?schoolName=${encodedSchool}&category=all&limit=${limit}&offset=0`,
        );
        const data = await res.json();
        setOtherProducts2(data.products);
        setTotalProducts(data.total);
        setOffset(limit); // prepare for next page
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoadingMore(false);
      }
    };

    loadInitialProducts();
  }, [user?.schoolName]);

  //Refresh action after cart has been updated
  useEffect(() => {
    console.log('Cart updated, refresh triggered');
  }, [refreshFlag]);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };
  const isInsufficientPoints = product.priceInPoints > user.pointsBalance;
  const uniqueProducts = Array.from(
    new Map(otherProducts2.map(p => [p.productId, p])).values(),
  );

  return (
    <View style={ProductDetailsStyles.container}>
      <CustomHeader
        title="Product Details"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        style={ProductDetailsStyles.container2}
      >
        <View style={ProductDetailsStyles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={product.mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onScroll={handleScroll}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={ProductDetailsStyles.image}
              />
            )}
          />
          <Text style={ProductDetailsStyles.counter}>
            {currentIndex + 1}/{product.mediaUrls.length}
          </Text>
        </View>
        <View style={ProductDetailsStyles.titleDiv}>
          <View style={ProductDetailsStyles.titleDivLeftDiv}>
            <Text
              style={ProductDetailsStyles.name}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {product.title}
            </Text>

            {product.description ? (
              <Text style={ProductDetailsStyles.description}>
                {product.description}
              </Text>
            ) : null}
            {product.location ? (
              <View style={ProductDetailsStyles.locationInfo}>
                <Icon name="location-outline" size={20} color="#f54b02" />
                <Text style={ProductDetailsStyles.location}>
                  {product.location}
                </Text>
              </View>
            ) : null}

            <Text style={ProductDetailsStyles.category}>
              {product.category}
            </Text>
          </View>

          <View style={ProductDetailsStyles.titleDivRightDiv}>
            <View style={ProductDetailsStyles.titleDivRightDivSubdiv}>
              <Icon name="diamond-outline" size={25} color="#f54b02" />
              <Text style={ProductDetailsStyles.price}>
                {product.priceInPoints}
              </Text>
            </View>
          </View>
        </View>
        <View style={ProductDetailsStyles.sizeAndColorsDiv}>
          {(hasSizes || hasColors) && (
            <View style={ProductDetailsStyles.sizeAndColorsDiv}>
              {hasSizes && (
                <View
                  style={[
                    ProductDetailsStyles.sizeDiv,
                    { width: hasColors ? '46%' : '100%' },
                  ]}
                >
                  <Text style={ProductDetailsStyles.label}>Sizes</Text>
                  <View style={ProductDetailsStyles.colorSelectorsDiv}>
                    {product.sizes?.map((size, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          ProductDetailsStyles.option,
                          selectedSize === size &&
                            ProductDetailsStyles.selectedOption,
                        ]}
                        onPress={() => setSelectedSize(size)}
                      >
                        <Text style={ProductDetailsStyles.optionText}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {hasColors && (
                <View
                  style={[
                    ProductDetailsStyles.colorsDiv,
                    { width: hasSizes ? '46%' : '100%' },
                  ]}
                >
                  <Text style={ProductDetailsStyles.label}>Colors</Text>
                  <View style={ProductDetailsStyles.colorSelectorsDiv}>
                    {product.colors?.map((color, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          ProductDetailsStyles.optionColor,
                          { backgroundColor: color },
                          selectedColor === color &&
                            ProductDetailsStyles.selectedOption,
                        ]}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
        {product.type === 'File' && product.fileUrl && (
          <View style={ProductDetailsStyles.fileInfoContainer}>
            <View style={ProductDetailsStyles.fileInfoContainerLeftDiv}>
              <Text style={ProductDetailsStyles.fileInfoText}>
                File Format:{' '}
                {product.fileUrl.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
            <View style={ProductDetailsStyles.fileInfoContainerRightDiv}>
              <Text style={ProductDetailsStyles.fileInfoText2}>
                File size: {product.fileSizeInMB} MB
              </Text>
              <Text
                style={[
                  ProductDetailsStyles.fileInfoText2,
                  ProductDetailsStyles.secondText,
                ]}
              >
                Download Count:{' '}
                {formatDownloadCount(product.downloadCount ?? 0)}
              </Text>
            </View>
          </View>
        )}
        {!loadingSeller && seller && (
          <View style={ProductDetailsStyles.sellerCard}>
            <View style={ProductDetailsStyles.sellerTitleDiv}>
              <Text style={ProductDetailsStyles.sellerTitle}>
                Seller Details
              </Text>
            </View>
            <View style={ProductDetailsStyles.sellerInfo}>
              <Image
                source={{ uri: seller.profilePic }}
                style={ProductDetailsStyles.sellerAvatar}
              />
              <View style={ProductDetailsStyles.sellerDetailsDiv}>
                <Text style={ProductDetailsStyles.sellerName}>
                  {seller.firstname} {seller.lastname}
                </Text>
                <View style={ProductDetailsStyles.sideBySide}>
                  <Icon name="mail-outline" size={20} color="#f54b02" />
                  <Text style={ProductDetailsStyles.sellerEmail}>
                    {seller.email}
                  </Text>
                </View>
                <View style={ProductDetailsStyles.sideBySide}>
                  <Icon name="call-outline" size={20} color="#f54b02" />
                  <Text style={ProductDetailsStyles.sellerPhone}>
                    {seller.phone_number}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {!loadingOthers && otherProducts.length > 0 && (
          <View style={ProductDetailsStyles.otherProductsContainer}>
            {seller && (
              <Text style={ProductDetailsStyles.otherProductsTitle}>
                More from {seller.firstname} {seller.lastname}
              </Text>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {otherProducts.map(item => (
                <TouchableOpacity
                  key={item.productId}
                  onPress={() =>
                    navigation2.push('ProductDetails', { product: item })
                  }
                  style={ProductDetailsStyles.otherProductCard}
                >
                  <View style={ProductDetailsStyles.otherProductImageDiv}>
                    <Image
                      source={{ uri: item.mediaUrls[0] }}
                      style={ProductDetailsStyles.otherProductImage}
                    />
                    <View
                      style={ProductDetailsStyles.otherProductsPriceDivInfo}
                    >
                      <Icon name="diamond-outline" size={20} color="#fff" />
                      <Text style={ProductDetailsStyles.otherProductPrice}>
                        {item.priceInPoints}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={ProductDetailsStyles.otherProductTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {!loadingOthers && otherProducts2.length > 0 && (
          <View style={ProductDetailsStyles.otherProductsContainer}>
            <Text style={ProductDetailsStyles.otherProductsTitle}>For You</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, layoutMeasurement, contentSize } =
                  nativeEvent;
                const isEndReached =
                  contentOffset.x + layoutMeasurement.width >=
                  contentSize.width - 10;

                if (isEndReached) {
                  console.log('Is reached...');
                  fetchMoreProducts();
                }
              }}
              scrollEventThrottle={400}
            >
              {uniqueProducts.map(item => (
                <TouchableOpacity
                  key={item.productId}
                  onPress={() =>
                    navigation2.push('ProductDetails', { product: item })
                  }
                  style={ProductDetailsStyles.otherProductCard}
                >
                  <View style={ProductDetailsStyles.otherProductImageDiv}>
                    <Image
                      source={{ uri: item.mediaUrls[0] }}
                      style={ProductDetailsStyles.otherProductImage}
                    />
                    <View
                      style={ProductDetailsStyles.otherProductsPriceDivInfo}
                    >
                      <Icon name="diamond-outline" size={20} color="#fff" />
                      <Text style={ProductDetailsStyles.otherProductPrice}>
                        {item.priceInPoints}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={ProductDetailsStyles.otherProductTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
              {loadingMore && (
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 10,
                  }}
                >
                  <ActivityIndicator size="small" color="#f54b02" />
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>
      <View style={ProductDetailsStyles.footer}>
        <View style={ProductDetailsStyles.leftFooter}>
          <TouchableOpacity
            style={[
              ProductDetailsStyles.footerBtn,
              isInsufficientPoints && HomeScreenComponentStyles.disabledButton, // dimmed style
            ]}
            onPress={() => {
              handleAddToCart(product);
              navigation2.navigate('Checkout');
            }}
            disabled={isInsufficientPoints}
          >
            <Text style={ProductDetailsStyles.footerBtnText}>Checkout</Text>
          </TouchableOpacity>
        </View>
        {!inCart && (
          <View style={ProductDetailsStyles.RightFooter}>
            <TouchableOpacity
              style={[ProductDetailsStyles.footerBtn]}
              onPress={() => handleAddToCart(product)}
            >
              <MaterialIcons name="shopping-cart" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Toast config={toastConfig} />
    </View>
  );
};

export default ProductDetails;
