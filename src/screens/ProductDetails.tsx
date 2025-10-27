import React, { useRef, useState, useEffect } from 'react';
import { useAppDataContext, AppDataProvider } from '../components/EventContext';
import {
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
} from '../assets/styles/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../components/hooks';
const { width } = Dimensions.get('window');
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';

type RouteParams = {
  ProductDetails: {
    product: Product;
  };
};
type HeaderProps = {
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
  const {
    cartProducts,
    //fetchFavorites,
    fetchCartItems,
    //toggleFavorite,
    //favoriteProducts,
  } = useAppDataContext();
  const navigation = useNavigation();
  const navigation2 = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RouteParams, 'ProductDetails'>>();
  const { product } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0;
  const [seller, setSeller] = useState<User | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [pressed, setPressed] = useState<{ [key: string]: boolean }>({});
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
  const [loadingOthers, setLoadingOthers] = useState(true);
  const handleAddToCart = async (cartItem: Product) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      const res = await fetch('http://192.168.1.98:5000/store/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: cartItem.productId }), // or cartItem.productId
      });

      if (res.ok) {
        setPressed(prev => ({
          ...prev,
          [cartItem.productId]: true, // ✅ must match item.productId
        }));
        await fetchCartItems();
        Toast.show({
          type: 'success',
          text1: 'Product successfully added to cart',
          position: 'bottom',
          bottomOffset: 10,
        });
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
    console.log('Product:', product);
    const fetchOtherProducts = async () => {
      try {
        console.log('Sending sellerId:', product?.sellerId);
        console.log('Sending productId:', product?.productId);
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
        console.log(data);
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

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };
  const isInsufficientPoints = product.priceInPoints > user.pointsBalance;
  const isInCart = cartProducts.some(
    item => item.productId === product.productId,
  );

  return (
    <AppDataProvider user={user}>
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
                <TouchableOpacity
                  onPress={() =>
                    navigation2.navigate('ProductSellerScreen', {
                      seller: product.sellerId,
                    })
                  }
                >
                  <MaterialIcons
                    name="navigate-next"
                    size={23}
                    color="#8e8d8dff"
                  />
                </TouchableOpacity>
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
        </ScrollView>
        <View style={ProductDetailsStyles.footer}>
          <View style={ProductDetailsStyles.leftFooter}>
            <TouchableOpacity
              style={[
                ProductDetailsStyles.footerBtn,
                isInsufficientPoints && { backgroundColor: '#fb966bff' }, // dimmed style
              ]}
              disabled={isInsufficientPoints}
            >
              <Text style={ProductDetailsStyles.footerBtnText}>Checkout</Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              ProductDetailsStyles.rightFooter,
              isInCart && { width: '24%' }, // apply width only if in cart
            ]}
          >
            <TouchableOpacity
              style={ProductDetailsStyles.footerBtn}
              onPress={() => handleAddToCart(product)}
            >
              <MaterialIcons
                name="shopping-cart"
                size={20}
                color={pressed ? '#fff' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>
        <Toast config={toastConfig} />
      </View>
    </AppDataProvider>
  );
};



export default ProductDetails;
