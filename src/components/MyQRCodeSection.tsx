

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { markOrderAsDroppedOffAPI } from '../api/localPatchApis';
import Toast from 'react-native-toast-message';

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
interface FAQItemProps {
  question: string;
  answer: string;
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
  const { colors } = useTheme();
  return (
    <View
      style={[
        QRCodeStyles.qrSection,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Text style={[QRCodeStyles.sectionLabel, { color: colors.text }]}>
        Your Receiving iTag
      </Text>
      <View
        style={[
          QRCodeStyles.qrWrapper,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <QRCode
          value={itagusername}
          size={200}
          color={colors.text}
          backgroundColor={colors.backgroundSecondary}
        />
      </View>
      <Text style={[QRCodeStyles.iTagText, { color: colors.text }]}>
        @{itagusername}
      </Text>
    </View>
  );
};
export const OrderAccordion = ({ order }: OrderProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const navigation = useNavigation<any>();

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  const isPending = order.status === 'pending_delivery';
  const isDroppedOff = order.status === 'dropped_off';
  const isActiveActive = isPending || isDroppedOff;

  return (
    <View
      style={[
        QRCodeStyles.cardContainer,
        {
          backgroundColor: colors.backgroundSecondary,
          shadowColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={QRCodeStyles.header}
      >
        <View style={QRCodeStyles.headerLead}>
          <View
            style={[
              QRCodeStyles.statusDot,
              {
                backgroundColor: isPending
                  ? colors.pendingDelivery
                  : isDroppedOff
                  ? colors.primaryTint
                  : colors.text,
              },
            ]}
          />
          <View>
            <Text
              style={[QRCodeStyles.productTitle, { color: colors.textDarker }]}
              numberOfLines={1}
            >
              {order.productName}
            </Text>
            <Text style={[QRCodeStyles.orderIdText, { color: colors.text }]}>
              Order #{order.orderId}
            </Text>
          </View>
        </View>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={colors.text}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          {isActiveActive ? (
            <View style={QRCodeStyles.qrSection2}>
              <View style={QRCodeStyles.qrWrapper2}>
                <QRCode
                  value={order.orderId}
                  size={160}
                  color={colors.text}
                  backgroundColor={colors.backgroundSecondary}
                />
              </View>
              {isDroppedOff ? (
                <Text
                  style={[QRCodeStyles.instructionText, { color: colors.text }]}
                >
                  Your product has been dropped off! Please head over to the
                  station to pick it up. Show this QR code to the Agent.
                </Text>
              ) : (
                <Text
                  style={[QRCodeStyles.instructionText, { color: colors.text }]}
                >
                  Show this QR code to the{' '}
                  {order.selectedStation ? 'Agent' : 'Seller'}
                </Text>
              )}
              {order.selectedStation && (
                <View style={QRCodeStyles.stationBox}>
                  <MaterialIcons
                    name="local-shipping-outlined"
                    size={16}
                    color={colors.text}
                  />
                  <Text
                    style={[QRCodeStyles.stationText, { color: colors.text }]}
                  >
                    {order.selectedStation.address}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={QRCodeStyles.digitalSection}>
              <MaterialIcons
                name="check-circle-outlined"
                size={60}
                color={colors.success}
              />
              <Text
                style={[
                  QRCodeStyles.completedText,
                  { color: colors.textDarker },
                ]}
              >
                Transaction Completed
              </Text>
              {order.productType === 'file' && order.fileUrl && (
                <TouchableOpacity
                  style={[
                    QRCodeStyles.downloadButton,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() => handleDownload(order.fileUrl!)}
                >
                  <MaterialIcons
                    name="file-download"
                    size={20}
                    color={colors.btnTextColor}
                  />
                  <Text
                    style={[
                      QRCodeStyles.downloadButtonText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Download File
                  </Text>
                </TouchableOpacity>
              )}
              {order.productType === 'course' && (
                <TouchableOpacity
                  style={[
                    QRCodeStyles.accessButton,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() => navigation.navigate('MyDownloads')}
                >
                  <Text
                    style={[
                      QRCodeStyles.accessButtonText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Go to My Downloads
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
export const SellerOrderAccordion = ({ order, onStatusUpdated }: any) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleMarkAsDroppedOff = async () => {
    Alert.alert(
      'Confirm Drop-off',
      `Have you dropped off this item at ${order.selectedStation?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirmed',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await markOrderAsDroppedOffAPI(order.orderId);
              if (result.success) {
                Toast.show({
                  type: 'success',
                  text2:
                    result.message ||
                    'Product marked as delivered at drop off station',
                });
                if (onStatusUpdated) onStatusUpdated();
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Patch Error',
                  text2:
                    result.message || 'Action not successful, please retry.',
                });
              }
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: err.message || 'Something went wrong, please retry.',
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const statusConfig: Record<
    string,
    { color: string; label: string; icon: any }
  > = {
    pending_delivery: {
      color: colors.pendingDelivery,
      label: 'Awaiting Delivery',
      icon: 'hourglass-empty-outlined',
    },
    dropped_off: {
      color: colors.primaryTint,
      label: 'Dropped Off at Station',
      icon: 'location-on-outlined',
    },
    completed: {
      color: colors.success,
      label: 'Delivered & Paid',
      icon: 'check-circle-outlined',
    },
    cancelled: {
      color: colors.primary,
      label: 'Cancelled',
      icon: 'cancel-outlined',
    },
  };

  const currentStatus =
    statusConfig[order.status] || statusConfig.pending_delivery;

  return (
    <View
      style={[
        QRCodeStyles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={QRCodeStyles.header}
      >
        <View style={QRCodeStyles.headerLead}>
          <View
            style={[
              QRCodeStyles.statusDot,
              { backgroundColor: currentStatus.color },
            ]}
          />
          <View>
            <Text
              style={[QRCodeStyles.productTitle, { color: colors.textDarker }]}
              numberOfLines={1}
            >
              {order.productName}
            </Text>
            <Text style={[QRCodeStyles.orderIdText, { color: colors.text }]}>
              Order #{order.orderId} • {order.quantity} qty
            </Text>
          </View>
        </View>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={colors.text}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          <View style={QRCodeStyles.detailsGrid}>
            <DetailItem
              label="Total Order Payment"
              value={<CurrencyDisplay value={order.amountPaid} size="small" />}
            />
            <DetailItem
              label="Date"
              value={new Date(order.createdAt).toLocaleDateString()}
            />
          </View>
          {order.status === 'pending_delivery' && (
            <View>
              <View style={QRCodeStyles.actionBox}>
                <MaterialIcons
                  name="delivery-dining"
                  size={22}
                  color={currentStatus.color}
                />
                <Text style={[QRCodeStyles.actionText, { color: colors.text }]}>
                  {order.deliveryMethod === 'drop_off' && order.selectedStation
                    ? `Please drop this off at: ${order.selectedStation.name}`
                    : 'Buyer is currently awaiting for direct delivery.'}
                </Text>
              </View>
              {order.deliveryMethod === 'drop_off' && (
                <View style={[QRCodeStyles.actionBox, { marginTop: 15 }]}>
                  <Text
                    style={[
                      QRCodeStyles.secondActionText,
                      { color: colors.text },
                    ]}
                  >
                    Already dropped off?
                  </Text>
                  <TouchableOpacity
                    style={[
                      QRCodeStyles.submitButton,
                      {
                        backgroundColor: colors.btnColor,
                      },
                    ]}
                    onPress={handleMarkAsDroppedOff}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator
                        color={colors.btnTextColor}
                        size="small"
                      />
                    ) : (
                      <Text
                        style={[
                          QRCodeStyles.submitButtonText,
                          { color: colors.btnTextColor },
                        ]}
                      >
                        Mark as Dropped Off
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          {order.status === 'dropped_off' && (
            <View style={QRCodeStyles.actionBox}>
              <MaterialIcons
                name="storefront-outlined"
                size={20}
                color={currentStatus.color}
              />
              <Text style={[QRCodeStyles.actionText, { color: colors.text }]}>
                Item package safely logged at{' '}
                {order.selectedStation?.name || 'hub'}. Awaiting transaction
                settlement upon buyer pick up scan.
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
              <Text style={[QRCodeStyles.actionText, { color: colors.text }]}>
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
              <Text style={[QRCodeStyles.actionText, { color: colors.text }]}>
                Order completed and verified on{' '}
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
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        QRCodeStyles.detailItem,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Text style={[QRCodeStyles.detailLabel, { color: colors.text }]}>
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text style={[QRCodeStyles.detailValue, { color: colors.textDarker }]}>
          {value}
        </Text>
      ) : (
        <View>{value}</View>
      )}
    </View>
  );
};

export const FAQItem = ({ question, answer }: FAQItemProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  return (
    <View
      style={[
        QRCodeStyles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={QRCodeStyles.header}
      >
        <Text style={[QRCodeStyles.questionText, { color: colors.textDarker }]}>
          Q: {question}
        </Text>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color={colors.text}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          <Text style={[QRCodeStyles.answerText, { color: colors.text }]}>
            {answer}
          </Text>
        </View>
      )}
    </View>
  );
};
export const StudentGradeCard = ({
  student,
  xFactor,
}: {
  student: any;
  xFactor: number;
}) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const rawTotal =
    student.attendanceCount +
    (student.testScores?.reduce((a: number, b: number) => a + b, 0) || 0);
  const projectedScore = (rawTotal * xFactor).toFixed(2);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View
      style={[
        QRCodeStyles.cardContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <TouchableOpacity onPress={toggleAccordion} style={QRCodeStyles.header}>
        <View style={QRCodeStyles.headerLead2}>
          <Text
            style={[QRCodeStyles.productTitle, { color: colors.textDarker }]}
          >
            {student.studentName}
          </Text>
          <Text style={[QRCodeStyles.orderIdText, { color: colors.text }]}>
            {student.matricNumber}
          </Text>
        </View>
        <View style={QRCodeStyles.header}>
          <Text
            style={[
              QRCodeStyles.productTitle,
              { color: colors.textDarker, marginHorizontal: 6 },
            ]}
          >
            {projectedScore}
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={colors.text}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={QRCodeStyles.expandedContent}>
          <Text
            style={[
              QRCodeStyles.productTitle,
              { color: colors.textDarker, marginBottom: 15 },
            ]}
          >
            Performance Breakdown
          </Text>
          <Text style={[QRCodeStyles.text, { color: colors.text }]}>
            Attendance Points: {student.attendanceSum}
          </Text>
          <Text
            style={[
              QRCodeStyles.text,
              { color: colors.text, marginVertical: 15 },
            ]}
          >
            Test Points: {student.testSum}
          </Text>
          <View
            style={[QRCodeStyles.divider, { backgroundColor: colors.border }]}
          />
          <Text
            style={[QRCodeStyles.productTitle, { color: colors.textDarker }]}
          >
            Total Calculated Score:{' '}
            {((student.attendanceSum + student.testSum) * xFactor).toFixed(2)}
          </Text>
          <Text
            style={[
              QRCodeStyles.productTitle,
              { color: colors.textDarker, marginBottom: 15 },
            ]}
          >
            Activity Log
          </Text>
          {student.allActivities
            .slice(0, 5)
            .map((activity: any, index: number) => (
              <View key={index}>
                <Text
                  style={[
                    QRCodeStyles.text,
                    { color: colors.text, marginBottom: 15 },
                  ]}
                >
                  {activity.topicName || activity.testId || 'Exception Request'}
                </Text>
                <Text style={[QRCodeStyles.text, { color: colors.text }]}>
                  {activity.score ? `+${activity.score} pts` : 'Verified'}
                </Text>
              </View>
            ))}
          {student.allActivities.length > 5 && (
            <Text style={[QRCodeStyles.text, { color: colors.text }]}>
              ... and {student.allActivities.length - 5} more entries
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const QRCodeStyles = StyleSheet.create({
  qrSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
  },
  qrSection2: {
    alignItems: 'center',
    width: '100%',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrWrapper: {
    padding: 20,
    borderRadius: 24,
    marginTop: 10,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
  },
  qrWrapper2: {
    marginBottom: 15,
  },
  iTagText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  cardContainer: {
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubDiv: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLead: {
    flexDirection: 'row',
    flex: 1,
  },
  headerLead2: {
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 14,
  },
  orderIdText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 3,
  },
  expandedContent: {
    marginTop: 15,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 15,
  },
  stationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stationText: {
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '500',
  },
  digitalSection: {
    alignItems: 'center',
  },
  completedText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  accessButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 13,
  },
  accessButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  downloadButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  downloadButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    padding: 10,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  secondActionText: {
    fontSize: 14,
    marginRight: 5,
  },
  submitButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandedContentSubdiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  divider: {
    height: 1,
    width: '80%',
    marginBottom: 8,
    alignSelf: 'center',
  },
});