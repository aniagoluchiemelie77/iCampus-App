// CheckoutScreen.tsx
import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, clearCart } from '../components/cartProductsSlice'; // adjust path
import { useAppSelector } from '../components/hooks';
import {
  NotificationPageStyles,
  CalendarScreenStyles,
  ProductDetailsStyles,
  HomeScreenComponentStyles,
} from '../assets/styles/colors';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { HeaderProps } from './ProductDetails';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationPropCheckout = StackNavigationProp<
  RootStackParamList,
  'Checkout'
>;
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

const CheckoutScreen = () => {
  const cartItems = useSelector(selectCartItems);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const navigation2 = useNavigation<NavigationPropCheckout>();
  const user = useAppSelector(state => state.user);

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.priceInPoints * item.quantity,
    0,
  );
  const purchasedItems = cartItems.map(item => ({
    productId: item.productId,
    title: item.title,
    quantity: item.quantity,
    priceInPoints: item.priceInPoints,
    selectedSize: item.selectedSize || '',
    selectedColor: item.selectedColor || '',
  }));

  const handlePayment = async () => {
    const token = await AsyncStorage.getItem('authToken');
    const totalProductsPurchased = cartItems.length;
    const totalPointsSpent = cartItems.reduce(
      (sum, item) => sum + item.priceInPoints * item.quantity,
      0,
    );

    try {
      const res = await fetch('http://192.168.1.98:5000/store/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetch('http://192.168.1.98:5000/store/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: user.uid,
            totalProductsPurchased,
            totalPointsSpent,
            items: purchasedItems,
          }),
        });
        console.log('Purchase successful.');
        dispatch(clearCart());
        Toast.show({
          type: 'success',
          text1: `Paid ${formatPoints(totalPointsSpent)} successfully`,
          position: 'bottom',
          bottomOffset: 10,
        });
        setTimeout(() => {
          navigation2.navigate('Home');
        }, 3000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Payment failed',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Payment error',
        position: 'bottom',
        bottomOffset: 10,
      });
    }
  };

  const formatPoints = (points: number): string => {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}K (${points})`;
    }
    return `${points}`;
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.itemContainer}>
      <View style={styles.imageDiv}>
        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Image source={{ uri: item.mediaUrls[0] }} style={styles.image} />
      </View>

      <View style={styles.details}>
        <Text style={styles.name}>{item.title}</Text>
        {item.location && (
          <View style={ProductDetailsStyles.locationInfo2}>
            <Icon name="location-outline" size={20} color="#f54b02" />
            <Text style={ProductDetailsStyles.location}> {item.location}</Text>
          </View>
        )}

        {item.type === 'File' && item.fileSizeInMB && (
          <View style={styles.fileInfoDiv}>
            <Text style={[styles.fileInfoText, styles.marginRight]}>
              File Size: {item.fileSizeInMB} MB
            </Text>
            <Text style={styles.fileInfoText}>
              File Format:{' '}
              {item.fileUrl.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        )}

        {item.sizes?.length > 0 && (
          <View style={styles.sizeContainer}>
            <Text style={styles.fileInfoText}>
              Size: {item.selectedSize || 'N/A'}
            </Text>
          </View>
        )}

        {item.colors?.length > 0 && item.selectedColor && (
          <View style={styles.colorRow}>
            <View
              style={[
                styles.colorCircle,
                { backgroundColor: item.selectedColor },
              ]}
            />
          </View>
        )}

        <View style={styles.sizeContainer}>
          <Text style={styles.fileInfoText}>Qty: {item.quantity}</Text>
        </View>
        <View style={styles.sizeContainer2}>
          <Icon name="diamond-outline" size={21} color="#f54b02" />
          <Text style={styles.priceText}>
            {' '}
            {formatPoints(item.priceInPoints)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Checkout" onBack={() => navigation.goBack()} />
      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => `${item.productId}-${index}`}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={NotificationPageStyles.notificationsDiv}>
            <View style={NotificationPageStyles.emptyNotifications}>
              <Icon name="alert-circle-outline" size={20} color="#807f7fff" />
              <Text style={NotificationPageStyles.emptyNotificationsText}>
                Cart is empty.
              </Text>
            </View>
          </View>
        }
      />
      <View style={styles.footer}>
        <View style={HomeScreenComponentStyles.totalSectionCheckout}>
          <Text style={HomeScreenComponentStyles.totalLabel}>Total:</Text>
          <View style={HomeScreenComponentStyles.totalPrice}>
            <Icon
              name="diamond-outline"
              size={24}
              color="#f54b02"
              style={HomeScreenComponentStyles.totalPriceSign}
            />
            <Text style={HomeScreenComponentStyles.totalPriceValue}>
              {totalPrice.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            totalPrice > user.pointsBalance &&
              HomeScreenComponentStyles.disabledButton,
          ]}
          onPress={handlePayment}
          disabled={totalPrice > user.pointsBalance}
        >
          <Text style={styles.payText}>Pay Now</Text>
        </TouchableOpacity>
      </View>
      <Toast config={toastConfig} />
    </View>
  );
};

export default CheckoutScreen;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#eee' },
  itemContainer: {
    flexDirection: 'row',
    marginVertical: 7,
    padding: 10,
    backgroundColor: '#fff',
    width: '95%',
    borderRadius: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 5,
  },
  imageDiv: {
    width: 90,
    flexGrow: 1,
    alignItems: 'center',
  },
  details: { marginLeft: 10, flex: 1, padding: 10 },
  name: { fontWeight: '700', fontSize: 15, color: '#000', marginBottom: 5 },
  empty: { textAlign: 'center', marginTop: 50, fontSize: 18 },
  footer: {
    borderColor: '#fff',
    padding: 10,
    width: '100%',
    alignItems: 'center',
  },

  categoryContainer: {
    width: '100%',
    padding: 7,
  },
  categoryText: { color: '#585858ff', fontSize: 12, fontWeight: '700' },
  fileInfoDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-start',
    padding: 7,
  },
  fileInfoText: {
    color: '#484848ff',
    fontSize: 13,
  },
  marginRight: {
    marginRight: 5,
  },
  sizeContainer: {
    padding: 7,
    width: '100%',
    justifyContent: 'flex-start',
  },
  sizeContainer2: {
    padding: 7,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  priceText: {
    fontWeight: '700',
    marginLeft: 5,
    color: '#f54b02',
    fontSize: 13,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: '#f54b02',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '95%',
  },
  payText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
