

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { MarketplaceOrder } from '../types/firebase';
import { PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import { CurrencyDisplay } from './CurrencyFormatter';
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
interface OrderProps {
  order: {
    orderId: string;
    productName: string;
    productType?: string;
    deliveryMethod?: string;
    status: string;
    selectedStation?: { name: string; address: string };
    fileUrl?: string;
    createdAt: string;
  };
}
interface SellerOrderProps {
  order: MarketplaceOrder;
}
const handleDownload = (url: string) => {
  if (!url) {
    Alert.alert('Error', 'Download link not available.');
    return;
  }
  Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'Could not open download link.'),
  );
};
export const MyQRCodeSection = ({ itagusername }: { itagusername: string }) => {
  return (
    <View style={QRCodeStyles.qrSection}>
      <Text style={QRCodeStyles.sectionLabel}>Your Receiving iTag</Text>
      <View style={QRCodeStyles.qrWrapper}>
        <QRCode
          value={itagusername}
          size={200}
          color={PRIMARY_COLOR}
          backgroundColor="white"
        />
      </View>
      <Text style={QRCodeStyles.iTagText}>@{itagusername}</Text>
    </View>
  );
};
export const OrderAccordion = ({ order }: OrderProps) => {
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation<any>();

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const isPending = order.status === 'pending_delivery';

  return (
    <View style={QRCodeStyles.cardContainer}>
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={[QRCodeStyles.header, expanded && QRCodeStyles.headerExpanded]}
      >
        <View style={QRCodeStyles.headerLead}>
          <View
            style={[
              QRCodeStyles.statusDot,
              {
                backgroundColor: isPending ? PRIMARY_COLOR : PRIMARY_COLOR_TINT,
              },
            ]}
          />
          <View>
            <Text style={QRCodeStyles.productTitle} numberOfLines={1}>
              {order.productName}
            </Text>
            <Text style={QRCodeStyles.orderIdText}>Order #{order.orderId}</Text>
          </View>
        </View>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={PRIMARY_COLOR}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          {isPending ? (
            <View style={QRCodeStyles.qrSection2}>
              <View style={QRCodeStyles.qrWrapper2}>
                <QRCode
                  value={order.orderId}
                  size={160}
                  color={PRIMARY_COLOR}
                  backgroundColor="white"
                />
              </View>
              <Text style={QRCodeStyles.instructionText}>
                Show this QR code to the{' '}
                {order.selectedStation ? 'Agent' : 'Seller'}
              </Text>

              {order.selectedStation && (
                <View style={QRCodeStyles.stationBox}>
                  <MaterialIcons
                    name="local-shipping-outlined"
                    size={16}
                    color={PRIMARY_COLOR_TINT}
                  />
                  <Text style={QRCodeStyles.stationText}>
                    {order.selectedStation.name}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={QRCodeStyles.digitalSection}>
              <MaterialIcons
                name="check-circle-outlined"
                size={40}
                color={PRIMARY_COLOR}
              />
              <Text style={QRCodeStyles.completedText}>
                Transaction Completed
              </Text>
              {order.productType === 'file' && order.fileUrl && (
                <TouchableOpacity
                  style={QRCodeStyles.downloadButton}
                  onPress={() => handleDownload(order.fileUrl!)}
                >
                  <MaterialIcons name="file-download" size={20} color="white" />
                  <Text style={QRCodeStyles.downloadButtonText}>
                    Download File
                  </Text>
                </TouchableOpacity>
              )}
              {order.productType === 'course' && (
                <TouchableOpacity
                  style={QRCodeStyles.accessButton}
                  onPress={() => navigation.navigate('MyDownloads')}
                >
                  <Text style={QRCodeStyles.accessButtonText}>
                    Go to My Courses
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
export const SellerOrderAccordion = ({ order }: SellerOrderProps) => {
  const [expanded, setExpanded] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  const statusConfig = {
    pending_delivery: {
      color: '#FF9800',
      label: 'Awaiting Delivery',
      icon: 'HourglassEmpty',
    },
    completed: {
      color: '#4CAF50',
      label: 'Delivered & Paid',
      icon: 'CheckCircle',
    },
    cancelled: { color: PRIMARY_COLOR, label: 'Cancelled', icon: 'Cancel' },
  };
  const currentStatus = statusConfig[order.status];
  return (
    <View style={QRCodeStyles.cardContainer}>
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={[QRCodeStyles.header, expanded && QRCodeStyles.headerExpanded]}
      >
        <View style={QRCodeStyles.headerLead}>
          <View
            style={[
              QRCodeStyles.statusDot,
              { backgroundColor: currentStatus.color },
            ]}
          />
          <View>
            <Text style={QRCodeStyles.productTitle} numberOfLines={1}>
              {order.productName}
            </Text>
            <Text style={QRCodeStyles.orderIdText}>
              Order #{order.orderId} • {order.quantity} qty
            </Text>
          </View>
        </View>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={PRIMARY_COLOR_TINT}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          <View style={QRCodeStyles.detailsGrid}>
            <DetailItem
              label="Total Earnings"
              value={<CurrencyDisplay value={order.amountPaid} size="small" />}
            />
            <DetailItem
              label="Date"
              value={new Date(order.createdAt).toLocaleDateString()}
            />
          </View>
          {order.status === 'pending_delivery' && (
            <View style={QRCodeStyles.actionBox}>
              <MaterialIcons
                name="delivery-dining-outlined"
                size={20}
                color={currentStatus.color}
              />
              <Text style={QRCodeStyles.actionText}>
                {order.selectedStation
                  ? `Please drop this off at: ${order.selectedStation.name}`
                  : 'Buyer is currently awaiting for direct delivery.'}
              </Text>
            </View>
          )}
          {order.status === 'cancelled' && (
            <View style={QRCodeStyles.actionBox}>
              <MaterialIcons
                name="cancel-outlined"
                size={20}
                color={currentStatus.color}
              />
              <Text
                style={[
                  QRCodeStyles.actionText,
                  { color: currentStatus.color },
                ]}
              >
                Reason: {order.cancellationReason || 'No reason provided.'}
              </Text>
            </View>
          )}
          {order.status === 'completed' && (
            <View style={QRCodeStyles.actionBox}>
              <MaterialIcons
                name="check-circle-outlined"
                size={20}
                color={currentStatus.color}
              />
              <Text style={[QRCodeStyles.actionText, { color: '#2E7D32' }]}>
                Order completed and verified via QR scan on{' '}
                {new Date(order.completedAt!).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};
const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <View style={QRCodeStyles.detailItem}>
    <Text style={QRCodeStyles.detailLabel}>{label}</Text>
    {typeof value === 'string' ? (
      <Text style={QRCodeStyles.detailValue}>{value}</Text>
    ) : (
      <View style={{ marginTop: 4 }}>{value}</View>
    )}
  </View>
);

const QRCodeStyles = StyleSheet.create({
  qrSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  qrSection2: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    width: '100%',
  },
  sectionLabel: {
    fontSize: 18,
    color: '#2222',
    fontWeight: 'bold',
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
  },
  qrWrapper2: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  iTagText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cardContainer: {
    backgroundColor: '#fadccc',
    width: '100%',
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerExpanded: {
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  orderIdText: {
    fontSize: 10,
    color: PRIMARY_COLOR,
    marginTop: 2,
  },
  expandedContent: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginBottom: 15,
  },
  stationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
  },
  stationText: {
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
    marginLeft: 5,
    fontWeight: '500',
  },
  digitalSection: {
    alignItems: 'center',
  },
  completedText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginVertical: 10,
  },
  accessButton: {
    marginTop: 15,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  accessButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 15,
    gap: 8,
  },
  downloadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
  },
  detailItem: {
    width: '48%',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: '#222',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  actionBox: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  actionText: {
    fontSize: 13,
    color: '#2222',
    marginLeft: 10,
    flex: 1,
  },
});