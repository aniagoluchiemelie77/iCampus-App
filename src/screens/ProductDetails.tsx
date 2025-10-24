import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import type { Product, User } from '../types/firebase';
import { CalendarScreenStyles } from '../assets/styles/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
const { width } = Dimensions.get('window');
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';

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

  return (
    <View style={styles.container}>
      <CustomHeader
        title="Product Details"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        style={styles.container2}
      >
        <View style={styles.carouselContainer}>
          <FlatList
            ref={flatListRef}
            data={product.mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onScroll={handleScroll}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.image} />
            )}
          />
          <Text style={styles.counter}>
            {currentIndex + 1}/{product.mediaUrls.length}
          </Text>
        </View>
        <View style={styles.titleDiv}>
          <View style={styles.titleDivLeftDiv}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
              {product.title}
            </Text>

            {product.description ? (
              <Text style={styles.description}>{product.description}</Text>
            ) : null}
            {product.location ? (
              <View style={styles.locationInfo}>
                <Icon name="location-on" size={20} color="#f54b02" />
                <Text style={styles.location}>{product.location}</Text>
              </View>
            ) : null}

            <Text style={styles.category}>{product.category}</Text>
          </View>

          <View style={styles.titleDivRightDiv}>
            <View style={styles.titleDivRightDivSubdiv}>
              <Icon name="diamond-outline" size={25} color="#f54b02" />
              <Text style={styles.price}>{product.priceInPoints}</Text>
            </View>
          </View>
        </View>
        <View style={styles.sizeAndColorsDiv}>
          {(hasSizes || hasColors) && (
            <View style={styles.sizeAndColorsDiv}>
              {hasSizes && (
                <View
                  style={[
                    styles.sizeDiv,
                    { width: hasColors ? '46%' : '100%' },
                  ]}
                >
                  <Text style={styles.label}>Sizes</Text>
                  <View style={styles.colorSelectorsDiv}>
                    {product.sizes?.map((size, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.option,
                          selectedSize === size && styles.selectedOption,
                        ]}
                        onPress={() => setSelectedSize(size)}
                      >
                        <Text style={styles.optionText}>{size}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {hasColors && (
                <View
                  style={[
                    styles.colorsDiv,
                    { width: hasSizes ? '46%' : '100%' },
                  ]}
                >
                  <Text style={styles.label}>Colors</Text>
                  <View style={styles.colorSelectorsDiv}>
                    {product.colors?.map((color, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionColor,
                          { backgroundColor: color },
                          selectedColor === color && styles.selectedOption,
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
          <View style={styles.fileInfoContainer}>
            <View style={styles.fileInfoContainerLeftDiv}>
              <Text style={styles.fileInfoText}>
                File Format:{' '}
                {product.fileUrl.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
            <View style={styles.fileInfoContainerRightDiv}>
              <Text style={styles.fileInfoText2}>
                File size: {product.fileSizeInMB} MB
              </Text>
              <Text style={[styles.fileInfoText2, styles.secondText]}>
                Download Count:{' '}
                {formatDownloadCount(product.downloadCount ?? 0)}
              </Text>
            </View>
          </View>
        )}

        {!loadingSeller && seller && (
          <View style={styles.sellerCard}>
            <View style={styles.sellerTitleDiv}>
              <Text style={styles.sellerTitle}>Seller Details</Text>
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
            <View style={styles.sellerInfo}>
              <Image
                source={{ uri: seller.profilePic }}
                style={styles.sellerAvatar}
              />
              <View style={styles.sellerDetailsDiv}>
                <Text style={styles.sellerName}>
                  {seller.firstname} {seller.lastname}
                </Text>
                <View style={styles.sideBySide}>
                  <Icon name="mail-outline" size={20} color="#f54b02" />
                  <Text style={styles.sellerEmail}>{seller.email}</Text>
                </View>
                <View style={styles.sideBySide}>
                  <Icon name="call-outline" size={20} color="#f54b02" />
                  <Text style={styles.sellerPhone}>{seller.phone_number}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {!loadingOthers && otherProducts.length > 0 && (
          <View style={styles.otherProductsContainer}>
            {seller && (
              <Text style={styles.otherProductsTitle}>
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
                  style={styles.otherProductCard}
                >
                  <Image
                    source={{ uri: item.mediaUrls[0] }}
                    style={styles.otherProductImage}
                  />
                  <Text
                    style={styles.otherProductTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  <View style={styles.otherProductsPriceDivInfo}>
                    <Icon name="diamond-outline" size={20} color="#f54b02" />
                    <Text style={styles.otherProductPrice}>
                      {item.priceInPoints}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.leftFooter}>
          <TouchableOpacity style={styles.footerBtn}>
            <Text style={styles.footerBtnText}>Checkout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.rightFooter}>
          <TouchableOpacity style={styles.footerBtn}>
            <MaterialIcons name="shopping-cart" size={20} color="#eee" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eee',
    flex: 1,
    position: 'relative',
  },
  container2: {
    padding: 6,
  },
  image: {
    width: Dimensions.get('window').width,
    height: 450,
    resizeMode: 'cover',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  description: {
    fontSize: 15,
    color: '#000',
    paddingVertical: 10,
  },
  price: {
    fontSize: 20,
    color: '#f54b02',
    fontWeight: '700',
    marginLeft: 2,
  },
  carouselContainer: { position: 'relative', borderRadius: 10 },
  counter: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#fff',
    color: '#f54b02',
    padding: 15,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  titleDiv: {
    width: '100%',
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
  },
  titleDivLeftDiv: {
    width: '70%',
  },
  category: {
    fontSize: 12,
    color: '#8a8989ff',
    paddingTop: 7,
  },
  location: {
    fontSize: 12,
    color: '#8a8989ff',
    marginRight: 4,
  },
  titleDivRightDiv: {
    flex: 1,
  },
  titleDivRightDivSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
  },
  sizeAndColorsDiv: {
    flexDirection: 'row',
    marginVertical: 5,
    width: '100%',
  },
  sizeDiv: {
    padding: 15,
    margin: 7,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  colorsDiv: {
    padding: 15,
    margin: 7,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  option: {
    borderRadius: 10,
    backgroundColor: '#eee',
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
  },
  optionColor: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelectorsDiv: {
    marginTop: 7,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#000',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#f54b02',
  },
  sellerCard: {
    marginVertical: 5,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  sellerTitleDiv: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000',
  },
  sellerInfo: {
    flexDirection: 'row',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otherProductsPriceDivInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
    padding: 6,
  },
  sellerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 10,
  },
  sellerDetailsDiv: {
    flex: 1,
    alignItems: 'flex-start',
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerEmail: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  sellerPhone: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  sellerDept: {
    fontSize: 13,
    color: '#777',
  },
  footer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#fff',
    padding: 7,
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
  },
  leftFooter: {
    width: '76%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightFooter: {
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    padding: 10,
    backgroundColor: '#f54b02',
    borderRadius: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtnText: {
    fontWeight: '700',
    color: '#eee',
  },
  fileInfoContainer: {
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    padding: 10,
  },
  fileInfoText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  fileInfoText2: {
    fontSize: 14,
    color: '#000',
    padding: 10,
  },
  fileInfoContainerLeftDiv: {
    width: '50%',
    padding: 10,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoContainerRightDiv: {
    alignItems: 'flex-start',
  },
  secondText: {
    backgroundColor: '#eee',
    padding: 10,
  },
  otherProductsContainer: {
    marginVertical: 10,
    backgroundColor: '#fff',
    padding: 10,
  },
  otherProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    padding: 10,
  },
  otherProductCard: {
    width: 170,
    marginRight: 13,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#eee',
    paddingVertical: 3,
  },
  otherProductImage: {
    width: 160,
    height: 160,
    borderRadius: 10,
  },
  otherProductTitle: {
    fontSize: 13,
    padding: 7,
    fontWeight: '700',
    width: '100%',
    justifyContent: 'flex-start',
  },
  otherProductPrice: {
    fontSize: 13,
    color: '#f54b02',
    fontWeight: '700',
    marginLeft: 3,
  },
});

export default ProductDetails;
