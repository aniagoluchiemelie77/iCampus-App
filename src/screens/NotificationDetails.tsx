import React, { useEffect, useState,  } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Linking  } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import type { RootStackParamList } from '../../App';
import { CalendarScreenStyles, NotificationPageStyles } from '../assets/styles/colors'; // adjust import paths
import {baseUrl} from '../components/HomeScreenComponents';
import {PurchaseHistory, Notification} from '../types/firebase';
import LogoBigger from '../assets/images/Logo.tsx';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';



type NavigationProp = StackNavigationProp<RootStackParamList, 'NotificationDetails'>;

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

const CustomHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <View style={[CalendarScreenStyles.headerContainer2, {width: '100%'}]}>
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
  const route = useRoute<RouteProp<RootStackParamList, 'NotificationDetails'>>();
  const { notificationId } = route.params;
  const [notification, setNotification] = useState<Notification | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!notificationId) return;

    const fetchNotification = async () => {
      try {
        const res = await fetch(`${baseUrl}users/notifications/${notificationId}`);
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
    <ScrollView contentContainerStyle={styles.container}>
        {notification ? (
            <>
                <CustomHeader title= 'Notification Details' onBack={() => navigation2.goBack()} />

                {loading && (
                    <ActivityIndicator size="large" color="#f54b02" />
                )}
                {notification.type === 'transactions' && purchaseDetails ? (
                    <>
                        <View style={styles.transactionBox}>
                            <LogoBigger />
                            <Text style={styles.messageText}>{notification?.message ?? ' '}</Text>
                            <View style={styles.totalDiv}>
                                <Icon name="diamond-outline" size={30} color="#f54b02" />
                                <Text style={styles.totalPriceText}>{purchaseDetails.totalPointsSpent}</Text>
                            </View>
                            <View style={styles.statusDiv}>
                                <MaterialIcons name={icon} size={18} color={color} style={{ marginRight: 5 }} />
                                <Text style={[{ color }, styles.statusDivText]}>
                                  {(notification.status ?? 'pending').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.transactionBox}>
                            <View style={styles.transactionBoxHeader}>
                                <Text style={styles.transactionTitle}>Purchased Items:</Text>
                            </View>  
                            <View style={styles.notTransactionBoxHeader}>
                                {purchaseDetails.items.map((item, index) => (
                                    <View key={index} style={styles.itemBox}>
                                        <Text style={ styles.normalText}>{item.title}</Text>
                                        <View style={styles.sideBySide}>
                                            {item.selectedSize && (
                                                <Text style={styles.normalText2}>Size: {item.selectedSize}</Text>
                                            )}
                                            {item.selectedColor && (
                                                <Text style={styles.normalText2}>Color: {item.selectedColor}</Text>
                                            )}
                                        </View>
                                        <View style={styles.sideBySide}>
                                            <View style={styles.sideBySide2}>
                                                <Icon name="diamond-outline" size={15} color="#f54b02" />
                                                <Text style={styles.normalTextColored}>{item.priceInPoints}</Text>
                                            </View>
                                            <Text style={styles.normalText2}>Qty:  {item.selectedQuantity || 1}</Text>
                                        </View>
                                    </View>
                                ))}
                                <Text style={styles.normalText2b}>
                                    {formatDateWithSuffix(purchaseDetails.date)}
                                </Text>
                            </View>           
                        </View> 
                        <View style={styles.transactionBox}>
                          {notification.transactionIdMid && !allItemsAreFiles && (
                            <View style={styles.qrDiv}>
                              <Text style={styles.transactionTitle2b}>Scan to Complete Transaction</Text>
                              <QRCode value={notification.transactionIdMid} size={200} />
                              <Text style={styles.transactionTitle2c}>
                                This QR code should be scanned by the seller or at the pick up point to complete purchase
                              </Text>
                            </View>
                          )}
                          {/* ✅ Show download buttons if fileUrls exist */}
                          {Array.isArray(notification.fileUrls) && notification.fileUrls.length > 0 && (
                            <>
                              {notification.fileUrls.map((url, index) => (
                                <View key={`file-${index}`} style={styles.downloadDiv}>
                                  <Text style={styles.transactionTitle3}>
                                     Download {purchaseDetails?.items?.[index]?.title ?? `File ${index + 1}`}
                                  </Text>
                                  <TouchableOpacity
                                    onPress={() => Linking.openURL(url)}
                                    style={styles.downloadBtn}
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
                        <View style={styles.content}>
                            <View style={styles.contentSubdiv}>
                            <Text style={styles.message1}>{notification.title}</Text>
                            <Text style={styles.message}>{notification.message}</Text>
                            <Text style={styles.date}>
                                {notification?.createdAt ? formatDateWithSuffix(notification.createdAt) : 'Date not available'}
                            </Text>
                            </View>
                        </View>
                    )
                }
            </>
            ) : (
                    <EmptyNotification />
                )
        }
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#eee', maxWidth: '100%' },
  content: { 
    padding: 15,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 7,
    flexGrow: 1,
    justifyContent: 'flex-start'
 },
 contentSubdiv: {
    width: '100%',
    height: 'auto'
 },
  title: { fontSize: 20, fontWeight: 'bold' },
  message: { marginBottom: 10, color: '#202020ff', flex: 1 },
  message1: { paddingVertical: 10, color: '#202020ff', flex: 1, fontWeight: '700', textAlign: 'left', fontSize: 17 },
  messageText: { 
    paddingVertical: 8,
    fontSize: 14,
    width: '100%',
    textAlign: 'center'
 },
  date: {  color: 'gray', alignSelf: 'flex-end', fontSize: 13, paddingVertical: 10 },
  transactionBox: { 
    padding: 15,
    width: '95%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 7,
    justifyContent: 'center',
    alignItems: 'center'
 },
  transactionTitle: { fontWeight: 'bold' },
  transactionTitle2: { fontWeight: 'bold', textAlign: 'center', width: '100%', marginVertical: 10 },
  transactionTitle3: { fontWeight: 'bold', textAlign: 'left', width: '100%', marginVertical: 10 },
  transactionTitle2b: { fontWeight: 'bold', textAlign: 'center', width: '100%', marginVertical: 10, paddingBottom: 7 },
  transactionTitle2c: { width: '100%', marginVertical: 10, color: 'gray', paddingTop: 10 },
  itemBox: { paddingVertical: 5, flex: 1},
  totalDiv: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  totalPriceText: {
    fontSize: 30,
    fontWeight: '700',
    marginLeft: 5,
    color: '#f54b02'
  },
  statusDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: 8
  },
  statusDivText: {
    fontSize: 14
  }, 
  transactionBoxHeader: {
    width: '100%',
    paddingVertical: 10,
    justifyContent: 'flex-start'
  },
  notTransactionBoxHeader: {
    width: '100%',
    paddingVertical: 8,
  },
  normalText: {
    color: '#202020ff',
    fontSize: 14, 
    width: '100%',
    paddingBottom: 5
  }, 
  normalText2: {
    color: '#202020ff',
    fontSize: 13, 
  }, 
  normalText2b: {
    color: 'gray',
    fontSize: 13, 
    textAlign: 'right', 
    width: '100%', 
    marginTop: 7
  }, 
  normalTextColored: {
    color: '#f54b02',
    fontSize: 14, 
    marginLeft: 3
  }, 
  sideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 5
  },
  sideBySide2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrDiv: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7
  },
  downloadDiv: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 7
  },
  downloadBtn: {
    backgroundColor: '#f54b02',
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center'
  }
});
