import React, { useEffect, useState,  } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { RootStackParamList } from '../../App';
import {
  CalendarScreenStyles,
  NotificationPageStyles,
  NotificationDetailsStyles,
} from '../assets/styles/colors'; // adjust import paths
import { baseUrl } from '../components/HomeScreenComponents';
import { PurchaseHistory, Notification } from '../types/firebase';
import LogoBigger from '../assets/images/Logo.tsx';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'NotificationDetails'
>;

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'success':
      return { color: '#2e7d32', icon: 'check-circle', text: 'Successful' }; // green
    case 'pending':
      return { color: '#f9a825', icon: 'hourglass-empty', text: 'Pending' }; // amber
    case 'error':
      return { color: '#c62828', icon: 'error', text: 'Declined' }; // red
    default:
      return { color: '#757575', icon: 'help-outline', text: ' ' }; // gray fallback
  }
};
const formatDateWithSuffix = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? 'st'
      : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
      ? 'rd'
      : 'th';

  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  return `${month} ${day}${suffix} ${year}`;
};

const CustomHeader: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <View style={[CalendarScreenStyles.headerContainer2, { width: '100%' }]}>
    <TouchableOpacity onPress={onBack} style={CalendarScreenStyles.backButton}>
      <Icon name="arrow-back-outline" size={25} color="#f54b02" />
      <Text style={CalendarScreenStyles.headerTitle}>{title}</Text>
    </TouchableOpacity>
    <TouchableOpacity style={CalendarScreenStyles.callCenterbtn}>
      <MaterialCommunityIcons name="headset" size={25} color="#f54b02" />
    </TouchableOpacity>
  </View>
);

const EmptyNotification = () => (
  <View style={NotificationPageStyles.emptyNotifications}>
    <MaterialIcons name="notifications-off" size={20} color="#807f7fff" />
    <Text style={NotificationPageStyles.emptyNotificationsText}>
      Notification not found.
    </Text>
  </View>
);

export default function NotificationDetails() {
  const navigation2 = useNavigation<NavigationProp>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'NotificationDetails'>>();
  const { notificationId } = route.params;
  const [notification, setNotification] = useState<Notification | null>(null);
  const [purchaseDetails, setPurchaseDetails] =
    useState<PurchaseHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!notificationId) return;

    const fetchNotification = async () => {
      try {
        const res = await fetch(
          `${baseUrl}users/notifications/${notificationId}`,
        );
        const data = await res.json();
        setNotification(data.notification);
        if (data.purchaseDetails) {
          setPurchaseDetails(data.purchaseDetails);
        }
      } catch (err) {
        console.error('Error fetching notification:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotification();
  }, [notificationId]);

  const { color, icon } = getStatusStyle(notification?.status ?? 'pending');
  const allItemsAreFiles = purchaseDetails?.items?.every(item => item.fileUrl);

  return (
    <ScrollView contentContainerStyle={NotificationDetailsStyles.container}>
      {notification ? (
        <>
          <CustomHeader
            title="Notification Details"
            onBack={() => navigation2.goBack()}
          />

          {loading && <ActivityIndicator size="large" color="#f54b02" />}
          {notification.type === 'transactions' && purchaseDetails ? (
            <>
              <View style={NotificationDetailsStyles.transactionBox}>
                <LogoBigger />
                <Text style={NotificationDetailsStyles.messageText}>
                  {notification?.message ?? ' '}
                </Text>
                <View style={NotificationDetailsStyles.totalDiv}>
                  <Icon name="diamond-outline" size={30} color="#f54b02" />
                  <Text style={NotificationDetailsStyles.totalPriceText}>
                    {purchaseDetails.totalPointsSpent}
                  </Text>
                </View>
                <View style={NotificationDetailsStyles.statusDiv}>
                  <MaterialIcons
                    name={icon}
                    size={18}
                    color={color}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[{ color }, NotificationDetailsStyles.statusDivText]}
                  >
                    {(notification.status ?? 'pending').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={NotificationDetailsStyles.transactionBox}>
                <View style={NotificationDetailsStyles.transactionBoxHeader}>
                  <Text style={NotificationDetailsStyles.transactionTitle}>
                    Purchased Items:
                  </Text>
                </View>
                <View style={NotificationDetailsStyles.notTransactionBoxHeader}>
                  {purchaseDetails.items.map((item, index) => (
                    <View key={index} style={NotificationDetailsStyles.itemBox}>
                      <Text style={NotificationDetailsStyles.normalText}>
                        {item.title}
                      </Text>
                      <View style={NotificationDetailsStyles.sideBySide}>
                        {item.selectedSize && (
                          <Text style={NotificationDetailsStyles.normalText2}>
                            Size: {item.selectedSize}
                          </Text>
                        )}
                        {item.selectedColor && (
                          <Text style={NotificationDetailsStyles.normalText2}>
                            Color: {item.selectedColor}
                          </Text>
                        )}
                      </View>
                      <View style={NotificationDetailsStyles.sideBySide}>
                        <View style={NotificationDetailsStyles.sideBySide2}>
                          <Icon
                            name="diamond-outline"
                            size={15}
                            color="#f54b02"
                          />
                          <Text
                            style={NotificationDetailsStyles.normalTextColored}
                          >
                            {item.priceInPoints}
                          </Text>
                        </View>
                        <Text style={NotificationDetailsStyles.normalText2}>
                          Qty: {item.selectedQuantity || 1}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <Text style={NotificationDetailsStyles.normalText2b}>
                    {formatDateWithSuffix(purchaseDetails.date)}
                  </Text>
                </View>
              </View>
              <View style={NotificationDetailsStyles.transactionBox}>
                {notification.transactionIdMid && !allItemsAreFiles && (
                  <View style={NotificationDetailsStyles.qrDiv}>
                    <Text style={NotificationDetailsStyles.transactionTitle2b}>
                      Scan to Complete Transaction
                    </Text>
                    <QRCode value={notification.transactionIdMid} size={200} />
                    <Text style={NotificationDetailsStyles.transactionTitle2c}>
                      This QR code should be scanned by the seller or at the
                      pick up point to complete purchase
                    </Text>
                  </View>
                )}
                {/* ✅ Show download buttons if fileUrls exist */}
                {Array.isArray(notification.fileUrls) &&
                  notification.fileUrls.length > 0 && (
                    <>
                      {notification.fileUrls.map((url, index) => (
                        <View
                          key={`file-${index}`}
                          style={NotificationDetailsStyles.downloadDiv}
                        >
                          <Text
                            style={NotificationDetailsStyles.transactionTitle3}
                          >
                            Download{' '}
                            {purchaseDetails?.items?.[index]?.title ??
                              `File ${index + 1}`}
                          </Text>
                          <TouchableOpacity
                            onPress={() => Linking.openURL(url)}
                            style={NotificationDetailsStyles.downloadBtn}
                          >
                            <MaterialCommunityIcons
                              color="#fff"
                              name="tray-arrow-down"
                              size={16}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={{ color: '#fff' }}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
              </View>
            </>
          ) : (
            <View style={NotificationDetailsStyles.content}>
              <View style={NotificationDetailsStyles.contentSubdiv}>
                <Text style={NotificationDetailsStyles.message1}>
                  {notification.title}
                </Text>
                <Text style={NotificationDetailsStyles.message}>
                  {notification.message}
                </Text>
                <Text style={NotificationDetailsStyles.date}>
                  {notification?.createdAt
                    ? formatDateWithSuffix(notification.createdAt)
                    : 'Date not available'}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <EmptyNotification />
      )}
    </ScrollView>
  );
}

