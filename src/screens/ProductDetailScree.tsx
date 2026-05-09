import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useAppDataContext } from '../components/EventContext';
import {PageHeader} from '../components/PageHeader';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT, PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';

const { width } = Dimensions.get('window');

export const ProductDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { productId } = route.params as { productId: string };
    const { allProducts, handleCartItemToggle, handleToggleFavorite } = useAppDataContext();
    const currentUser = useAppSelector(state => state.user);
    const product = allProducts.find(p => p.productId === productId);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [selectedColor, setSelectedColor] = useState(product?.physicalDetails?.colors?.[0]);
    const [selectedSize, setSelectedSize] = useState(product?.physicalDetails?.sizes?.[0]);
    const [quantity, setQuantity] = useState(1);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
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
    return (
        <View style={styles.container}>
            <PageHeader
                title="Item Detail"
            />
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
                            { useNativeDriver: false }
                        )}
                        renderItem={({ item }) => (
                            <Image source={{ uri: item }} style={styles.productImage} />
                        )}
                        keyExtractor={(_, index) => index.toString()}
                    />
                    <View style={styles.pagination}>
                        {product.mediaUrls.map((_, i) => (
                            <View key={i} style={[styles.dot, activeImageIndex === i && styles.activeDot]} />
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
                        <View style={styles.price}>
                            <Text style={styles.price}>{product.priceInPoints}</Text>
                        </View>
                    </View>
                    {product.type === 'physical' && product.physicalDetails?.colors && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Color</Text>
                            <View style={styles.optionsRow}>
                                {product.physicalDetails.colors.map(color => (
                                    <TouchableOpacity 
                                        key={color} 
                                        style={[styles.colorOption, { backgroundColor: color.toLowerCase() }, selectedColor === color && styles.selectedBorder]} 
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
                                        style={[styles.sizeOption, selectedSize === size && styles.selectedSize]} 
                                        onPress={() => setSelectedSize(size)}
                                    >
                                        <Text style={selectedSize === size ? styles.whiteText : styles.blackText}>{size}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quantity</Text>
                        <View style={styles.quantityRow}>
                            <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}><Text>-</Text></TouchableOpacity>
                            <Text style={styles.qtyText}>{quantity}</Text>
                            <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}><Text>+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={styles.favBtn} 
                    onPress={() => handleToggleFavorite(product.productId)}
                >
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={28} color={isFavorite ? "red" : "black"} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.addToCartBtn}
                    onPress={() => handleCartItemToggle(product, selectedSize, selectedColor)}
                >
                    <Text style={styles.btnText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.checkoutBtn}
                    onPress={() => navigation.navigate('Checkout', { productId })}
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

  // --- Content Body ---
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -25, // Overlap the image slightly
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 100, // Space for the fixed footer
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    letterSpacing: -0.5,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#007AFF', // Theme Primary
    marginTop: 8,
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

  // --- Fixed Bottom Footer ---
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    gap: 12,
    // Add shadow to make it pop
    shadowColor: '#000',
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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#49454F',
    marginBottom: 12,
  },

  // --- Color Selection ---
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
    borderColor: '#E0E0E0',
  },
  selectedBorder: {
    borderWidth: 3,
    borderColor: '#007AFF', // Highlight ring for selected color
    transform: [{ scale: 1.1 }],
  },

  // --- Size Selection ---
  sizeOption: {
    minWidth: 50,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedSize: {
    backgroundColor: '#1A1C1E', // Dark background for selected size
    borderColor: '#1A1C1E',
  },
  whiteText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  blackText: {
    color: '#1A1C1E',
    fontWeight: '600',
  },

  // --- Quantity Selector ---
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    alignSelf: 'flex-start',
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow for the buttons
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 20,
    color: '#1A1C1E',
  },
  description: {
    fontSize: 14,
    color: '#31313122',
    marginTop: 7,
  },
  productImageDiv:{
    marginVertical: 10,
    width: width,
    height: 450,
    position: 'relative'
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
  titleContainer:{
    flexDirection: 'row',
    width: '100%'
  }
});