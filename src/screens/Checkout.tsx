// CheckoutScreen.tsx
import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCartItems,
  clearCartAndStorage,
} from '../components/CartProductsSlice'; // adjust path
import { useAppSelector } from '../components/hooks';
import {
  NotificationPageStyles,
  CalendarScreenStyles,
  ProductDetailsStyles,
  HomeScreenComponentStyles,
  CheckoutPageStyles,
} from '../assets/styles/colors';
import { AppDispatch } from '../components/store';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { HeaderProps } from './ProductDetails';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../../App';
import { baseUrl } from '../components/HomeScreenComponents';
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
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const navigation2 = useNavigation<NavigationPropCheckout>();
  const user = useAppSelector(state => state.user);

  const totalPrice = cartItems.reduce((sum, item) => {
    const quantity = Number(item.selectedQuantity) || 1;
    const price = Number(item.priceInPoints) || 0;
    return sum + price * quantity;
  }, 0);
  const purchasedItems = cartItems.map(item => ({
    productId: item.productId,
    title: item.title,
    selectedQuantity: item.selectedQuantity || '1',
    priceInPoints: item.priceInPoints,
    selectedSize: item.selectedSize || '',
    selectedColor: item.selectedColor || '',
    ...(item.isFile === true && {
      fileUrl: item.fileUrl,
      password: item.password,
    }),
  }));
  const handlePayment = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const totalProductsPurchased = cartItems.length;
      const totalPointsSpent = cartItems.reduce(
        (sum, item) =>
          sum +
          Number(item.priceInPoints) * (Number(item.selectedQuantity) || 1),
        0,
      );
      const res = await fetch(`${baseUrl}store/cart`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        Toast.show({
          type: 'error',
          text1: 'Cart clearing failed, please retry',
          position: 'bottom',
          bottomOffset: 10,
        });
        return;
      }
      const checkoutRes = await fetch(`${baseUrl}store/checkout`, {
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

      if (checkoutRes.ok) {
        dispatch(clearCartAndStorage());
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
          text1: 'Checkout failed',
          text2: 'Something went wrong during payment.',
          position: 'bottom',
          bottomOffset: 10,
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      Toast.show({
        type: 'error',
        text1: 'Unexpected error',
        text2: 'Please check your connection or try again later.',
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
    <View style={CheckoutPageStyles.itemContainer}>
      <View style={CheckoutPageStyles.imageDiv}>
        <View style={CheckoutPageStyles.categoryContainer}>
          <Text style={CheckoutPageStyles.categoryText}>{item.category}</Text>
        </View>
        <Image
          source={{ uri: item.mediaUrls[0] }}
          style={CheckoutPageStyles.image}
        />
      </View>

      <View style={CheckoutPageStyles.details}>
        <Text style={CheckoutPageStyles.name}>{item.title}</Text>
        {item.location && (
          <View style={ProductDetailsStyles.locationInfo2}>
            <Icon name="location-outline" size={20} color="#f54b02" />
            <Text style={ProductDetailsStyles.location}> {item.location}</Text>
          </View>
        )}

        {item.type === 'File' && item.fileSizeInMB && (
          <View style={CheckoutPageStyles.fileInfoDiv}>
            <Text
              style={[
                CheckoutPageStyles.fileInfoText,
                CheckoutPageStyles.marginRight,
              ]}
            >
              File Size: {item.fileSizeInMB} MB
            </Text>
            <Text style={CheckoutPageStyles.fileInfoText}>
              File Format:{' '}
              {item.fileUrl.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        )}

        {item.sizes?.length > 0 && item.selectedSize && (
          <View style={CheckoutPageStyles.sizeContainer}>
            <Text style={CheckoutPageStyles.fileInfoText}>
              Size: {item.selectedSize}
            </Text>
          </View>
        )}

        {item.colors?.length > 0 && item.selectedColor && (
          <View style={CheckoutPageStyles.colorRow}>
            <View
              style={[
                CheckoutPageStyles.colorCircle,
                { backgroundColor: item.selectedColor },
              ]}
            />
          </View>
        )}

        <View style={CheckoutPageStyles.sizeContainer}>
          <Text style={CheckoutPageStyles.fileInfoText}>
            Qty: {item.selectedQuantity || '1'}
          </Text>
        </View>
        <View style={CheckoutPageStyles.sizeContainer2}>
          <Icon name="diamond-outline" size={21} color="#f54b02" />
          <Text style={CheckoutPageStyles.priceText}>
            {' '}
            {formatPoints(item.priceInPoints)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={CheckoutPageStyles.container}>
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
        contentContainerStyle={{
          padding: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      <View style={CheckoutPageStyles.footer}>
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
            CheckoutPageStyles.payButton,
            totalPrice > user.pointsBalance &&
              HomeScreenComponentStyles.disabledButton,
          ]}
          onPress={handlePayment}
          disabled={totalPrice > user.pointsBalance}
        >
          <Text style={CheckoutPageStyles.payText}>Pay Now</Text>
        </TouchableOpacity>
      </View>
      <Toast config={toastConfig} />
    </View>
  );
};

export default CheckoutScreen;

