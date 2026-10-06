

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  LayoutAnimation,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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
export const OrderAccordion = ({ order }: OrderProps) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleAccordion = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const isPending = order.status === 'pending_delivery';
  const isDroppedOff = order.status === 'dropped_off';
  const isCompleted =
    order.status === 'completed' || order.status === 'delivered';

  const getStatusConfig = () => {
    if (isPending)
      return {
        label: 'Pending Delivery',
        bg: colors.pendingDelivery + '20',
        text: colors.pendingDelivery,
        icon: 'schedule',
      };
    if (isDroppedOff)
      return {
        label: 'Ready for Pickup',
        bg: colors.primaryTint + '20',
        text: colors.primary,
        icon: 'local-shipping',
      };
    return {
      label: 'Completed',
      bg: colors.success + '20',
      text: colors.success,
      icon: 'check-circle',
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <View
      style={[
        QRCodeStyles.modernCardContainer,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border ? colors.border + '40' : '#ffffff10',
        },
      ]}
    >
      <TouchableOpacity
        onPress={toggleAccordion}
        activeOpacity={0.7}
        style={QRCodeStyles.modernHeader}
      >
        <View style={QRCodeStyles.headerContent}>
          <View style={QRCodeStyles.titleRow}>
            <Text
              style={[
                QRCodeStyles.modernProductTitle,
                { color: colors.textDarker || colors.text },
              ]}
              numberOfLines={1}
            >
              {order.productName}
            </Text>
          </View>

          <View style={QRCodeStyles.subRow}>
            <Text
              style={[
                QRCodeStyles.modernOrderIdText,
                { color: colors.text + '99' },
              ]}
            >
              #{order.orderId}
            </Text>

            {/* Status Pill Badge */}
            <View
              style={[
                QRCodeStyles.statusBadge,
                { backgroundColor: statusConfig.bg },
              ]}
            >
              <MaterialIcons
                name={statusConfig.icon as any}
                size={12}
                color={statusConfig.text}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  QRCodeStyles.statusBadgeText,
                  { color: statusConfig.text },
                ]}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            QRCodeStyles.chevronBox,
            { backgroundColor: colors.background + '60' },
          ]}
        >
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={colors.text}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={QRCodeStyles.modernExpandedContent}>
          <View
            style={[
              QRCodeStyles.divider,
              { backgroundColor: colors.border + '20' },
            ]}
          />

          {isPending || isDroppedOff ? (
            <View style={QRCodeStyles.qrSectionModern}>
              <View
                style={[
                  QRCodeStyles.qrCardWrapper,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border + '30',
                  },
                ]}
              >
                <QRCode
                  value={order.orderId}
                  size={150}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
              </View>

              <Text
                style={[
                  QRCodeStyles.modernInstructionText,
                  { color: colors.text },
                ]}
              >
                {isDroppedOff
                  ? 'Your product has been dropped off! Head over to the station and show this QR code to the Agent.'
                  : `Show this QR code to the ${order.selectedStation ? 'Agent' : 'Seller'}.`}
              </Text>

              {order.selectedStation && (
                <View
                  style={[
                    QRCodeStyles.modernStationBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border + '30',
                    },
                  ]}
                >
                  <MaterialIcons
                    name="storefront"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      QRCodeStyles.modernStationText,
                      { color: colors.textDarker || colors.text },
                    ]}
                    numberOfLines={2}
                  >
                    {order.selectedStation.address}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={QRCodeStyles.modernDigitalSection}>
              <View
                style={[
                  QRCodeStyles.successIconBubble,
                  { backgroundColor: colors.success + '15' },
                ]}
              >
                <MaterialIcons
                  name="check-circle"
                  size={40}
                  color={colors.success}
                />
              </View>
              <Text
                style={[
                  QRCodeStyles.modernCompletedText,
                  { color: colors.textDarker || colors.text },
                ]}
              >
                Transaction Completed Successfully
              </Text>
              <Text
                style={[
                  QRCodeStyles.completedSubText,
                  { color: colors.text + '88' },
                ]}
              >
                Thank you for your order. This transaction has been securely
                closed.
              </Text>
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
                name="storefront"
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
                name="cancel"
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
                name="check-circle"
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
    flex: 1,
    marginTop: 20,
  },
  qrSection2: {
    alignItems: 'center',
    width: '100%',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
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
    marginTop: 25,
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
    marginTop: 25,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
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
  modernCardContainer: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modernProductTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modernOrderIdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernExpandedContent: {
    marginTop: 14,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  qrSectionModern: {
    alignItems: 'center',
    width: '100%',
  },
  qrCardWrapper: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  modernInstructionText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  modernStationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modernStationText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  modernDigitalSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modernCompletedText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  completedSubText: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});