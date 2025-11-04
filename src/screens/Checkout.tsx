// CheckoutScreen.tsx
import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, clearCart } from '../components/CartProductsSlice'; // adjust path
import { useAppSelector } from '../components/hooks';
import {
  NotificationPageStyles,
  CalendarScreenStyles,
  ProductDetailsStyles,
  HomeScreenComponentStyles,
  CheckoutPageStyles,
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

        {item.sizes?.length > 0 && (
          <View style={CheckoutPageStyles.sizeContainer}>
            <Text style={CheckoutPageStyles.fileInfoText}>
              Size: {item.selectedSize || 'N/A'}
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
            Qty: {item.quantity}
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

