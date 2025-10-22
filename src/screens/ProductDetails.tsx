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
import type { Product } from '../types/firebase';
import { CalendarScreenStyles } from '../assets/styles/colors';
import Icon from 'react-native-vector-icons/Ionicons';
const { width } = Dimensions.get('window');

type RouteParams = {
  ProductDetails: {
    product: Product;
  };
};
type HeaderProps = {
  title: string;
  onBack: () => void;
};
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
  const route = useRoute<RouteProp<RouteParams, 'ProductDetails'>>();
  const { product } = route.params;

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  const hasColors = Array.isArray(product.colors) && product.colors.length > 0;
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

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <ScrollView style={styles.container}>
      <CustomHeader
        title="Product Details"
        onBack={() => navigation.goBack()}
      />

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
          <Text style={styles.name}>{product.title}</Text>

          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
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
                style={[styles.sizeDiv, { width: hasColors ? '46%' : '100%' }]}
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
                style={[styles.colorsDiv, { width: hasSizes ? '46%' : '100%' }]}
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eee',
    flex: 1,
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
  carouselContainer: { position: 'relative' },
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
});

export default ProductDetails;
