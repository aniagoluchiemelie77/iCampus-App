import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { NotificationItem } from '../components/NotificationItem';
import { updateTicketStatus } from '../api/localPatchApis';
import {
  adminFetchUserDetails,
  adminFetchUserNotifications,
  fetchSupportTicketByRefIdAPI,
} from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { PageHeader } from '../components/PageHeader';
import { UserAvatar } from '../components/UserAvatar';
import { UserIdentity } from '../components/UserIdentity';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { EditUserModalContent } from '../components/editUser';
import { SendNotificationModal } from '../components/sendNotificationComponent';
import { CustomButton } from '../assets/components/AppUIComponents';
import { ActionModal } from '../components/LogoutModal.tsx';

export const TicketResolveScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const { ticket } = route.params;

  const [ticketDetails, setTicketDetails] = useState<any>(ticket);
  const [affectedUser, setAffectedUser] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isResolveModalVisible, setResolveModalVisible] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const loadContextData = async () => {
      try {
        const [userData, userNotifs, ticketResult] = await Promise.all([
          adminFetchUserDetails(ticketDetails.userId),
          adminFetchUserNotifications({ userId: ticketDetails.userId, limit: 10 }),
          fetchSupportTicketByRefIdAPI({
            ticketRefId: ticketDetails.ticketRefId,
          }),
        ]);
        setAffectedUser(userData);
        setRecentNotifications(userNotifs);
        if (ticketResult.success && ticketResult.ticket) {
          setTicketDetails(ticketResult.ticket);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Ticket Refresh Failed',
            text2: ticketResult.message || 'Showing the ticket list snapshot.',
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text2: 'Failed to load ticket details',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadContextData();
  }, [ticketDetails.ticketRefId, ticketDetails.userId]);

  const handleSetResolved = async () => {
    try {
      setIsResolving(true);
      const result = await updateTicketStatus(
        ticketDetails.ticketRefId,
        'resolved',
      );
      if (!result.success) return;
      setResolveModalVisible(false);
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: "Couldn't resolve the ticket, please retry.",
      });
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.criticalSeverity;
      case 'high':
        return colors.highSeverity;
      case 'medium':
        return colors.mediumSeverity;
      case 'low':
        return colors.lowSeverity;
      default:
        return colors.text;
    }
  };
  const handleNotificationPress = async (item: any) => {
    const { actionType, payload } = item;

    switch (actionType) {
      // --- POST GROUP (PostDetails) ---
      case 'POST_UPDATED':
      case 'NEW_POST':
      case 'POST_MENTION':
      case 'POST_LIKED':
      case 'POST_COMMENTED':
      case 'POLL_MILESTONE':
      case 'POST_REPOSTED':
        navigation.navigate('PostDetail', { postId: payload.postId });
        break;

      case 'PRODUCT_DELETION':
      case 'PRODUCT_CREATION':
      case 'PRODUCT_UPDATE':
        navigation.navigate('SalesHub');
        break;

      // --- ACADEMIC/COURSE UPDATES (NotificationDetails) ---
      case 'LECTURE_CANCELLED':
      case 'LECTURE_POSTPONED':
      case 'LECTURE_VENUE_CHANGE':
      case 'LECTURE_TYPE_CHANGE':
      case 'LECTURE_SCHEDULED':
        navigation.navigate('CourseSubPage', {
          title: 'View Lecture Schedule',
          userRole: affectedUser.usertype,
        });
        break;

      case 'CONTENT_MUTATED':
      case 'CONTENT_DELETION':
      case 'CONTENT_ADDED':
        navigation.navigate('CourseSubPage', {
          title: 'Course Contents',
          userRole: affectedUser.usertype,
          course: payload.course,
        });
        break;

      case 'EXCEPTION_UPDATED':
        navigation.navigate('CourseSubPage', {
          title: 'Exceptions',
          userRole: affectedUser.usertype,
        });
        break;

      case 'TEST_CREATED':
        navigation.navigate('CourseSubPage', {
          title: 'Assessments',
          userRole: affectedUser.usertype,
        });
        break;

      case 'ASSIGNMENT_CREATED':
      case 'ASSIGNMENT_REMOVED':
        navigation.navigate('CourseSubPage', {
          title: 'Assignments',
          userRole: affectedUser.usertype,
          course: payload.course,
        });
        break;

      case 'MATERIAL_UPLOADED':
      case 'MATERIAL_DELETED':
        navigation.navigate('CourseSubPage', {
          title: 'Course Materials',
          userRole: affectedUser.usertype,
          course: payload.course,
        });
        break;

      // --- OTHER SPECIALIZED PAGES ---
      case 'PROFILE_VIEW':
      case 'PROFILE_UPDATED':
        navigation.navigate('Profile', { identifier: affectedUser.uid });
        break;

      case 'NEW_FOLLOWER':
        navigation.navigate('Profile', { identifier: payload.followerId });
        break;

      case 'TEST_CREATED':
        navigation.navigate('CourseSubPage', {
          title: 'Assessments',
          userRole: affectedUser.usertype,
        });
        break;

      case 'SALES_PAYOUT_SUCCESS':
      case 'MARKET_PURCHASE_DEBIT':
      case 'ICASH_PURCHASE':
      case 'ICASH_WITHDRAWAL':
        navigation.navigate('TransactionDetail', {
          transactionId: payload.transactionId,
        });
        break;

      case 'ORDER_REVIEW_REQUEST':
        navigation.navigate('CreateReviewScreen', {
          targetId: payload.targetId,
          productType: 'product',
        });
        break;

      case 'LECTURER_REVIEW_REQUEST':
        navigation.navigate('CreateReviewScreen', {
          targetId: payload.targetId,
          productType: 'lecturer',
        });
        break;

      default:
        navigation.navigate('NotificationDetails', { notification: item });
        break;
    }
  };

  if (isLoading) {
    return (
      <View
        style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Support Ticket Details" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TICKET DETAILS */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
            Ticket Info
          </Text>
          <View style={styles.rowBetweenDiv}>
            <Text style={[styles.textLabel, { color: colors.text }]}>
              Ref:{' '}
              <Text style={{ fontWeight: 'bold' }}>
                #{ticketDetails.ticketRefId}
              </Text>
            </Text>
            <Text style={[styles.textLabel, { color: colors.text }]}>
              {ticketDetails.category
                ? ticketDetails.category.charAt(0).toUpperCase() +
                  ticketDetails.category.slice(1)
                : 'General'}
            </Text>
            <Text
              style={[
                styles.textLabel,
                { color: getSeverityColor(ticketDetails.severity || 'low') },
              ]}
            >
              {' '}
              {(ticketDetails.severity || 'low').toUpperCase()}
            </Text>
          </View>
          {ticketDetails.summary && (
            <Text style={[styles.summaryText, { color: colors.text }]}>
              {ticketDetails.summary}
            </Text>
          )}
          {Array.isArray(ticketDetails.thread) &&
          ticketDetails.thread.length > 0 ? (
            <View style={styles.thread}>
              <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
                Conversation
              </Text>
              {ticketDetails.thread.map((entry: any, index: number) => {
                const sender =
                  entry.sender ===
                  (ticketDetails.guestEmail || ticketDetails.userId)
                    ? 'User'
                    : 'Support';
                return (
                  <View key={`${entry.timestamp || 'message'}-${index}`}>
                    <Text style={[styles.threadSender, { color: colors.text }]}>
                      {sender}
                    </Text>
                    <View
                      style={[
                        styles.messageBox,
                        { borderLeftColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.messageText, { color: colors.text }]}>
                        {entry.message || 'Attachment'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : ticketDetails.originalMessage ? (
            <View
              style={[styles.messageBox, { borderLeftColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: colors.text, fontStyle: 'italic' },
                ]}
              >
                "{ticketDetails.originalMessage}"
              </Text>
            </View>
          ) : null}
        </View>

        {/* AFFECTED USER DETAILS */}
        {affectedUser && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
                User Context
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(true)}
                style={{ padding: 4 }}
              >
                <MaterialIcons name="edit" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.userDetailsIcon}>
              <UserAvatar
                profilePic={affectedUser.profilePic}
                firstName={affectedUser.firstname}
                lastName={affectedUser.lastname}
                username={affectedUser.username}
                style={styles.userAvatar}
              />
              <View style={styles.userDetails}>
                <UserIdentity
                  firstname={affectedUser.firstname}
                  lastname={affectedUser.lastname}
                  username={affectedUser.username}
                  tier={affectedUser.tier}
                  isVerified={affectedUser.isVerified}
                  showVerifyIcon={true}
                  size="medium"
                />
                <Text
                  style={[
                    styles.textLabel,
                    { color: colors.text, marginVertical: 5 },
                  ]}
                >
                  {affectedUser.email}
                </Text>
                <Text style={[styles.textLabel, { color: colors.text }]}>
                  iScore:{' '}
                  <Text style={{ fontWeight: 'bold' }}>
                    {affectedUser.currentIScore || 0}
                  </Text>
                </Text>
              </View>
            </View>
            {affectedUser.isSuspended && (
              <View style={styles.suspensionDiv}>
                <MaterialIcons name="info" size={16} color={colors.primary} />
                <Text
                  style={[styles.suspensionText, { color: colors.primary }]}
                >
                  ACCOUNT SUSPENDED
                </Text>
              </View>
            )}
          </View>
        )}

        {/* RECENT ACTIVITY */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
            User's Recent Activity
          </Text>
          {recentNotifications.length === 0 ? (
            <EmptyState
              iconName="notifications-off"
              title="No Recent Notifications"
              subtitle="This user hasn't received any system or ticket alerts yet."
            />
          ) : (
            recentNotifications.map(notif => (
              <NotificationItem
                key={notif.notificationId}
                item={notif}
                handleNotificationPress={handleNotificationPress}
              />
            ))
          )}
        </View>
      </ScrollView>
      <View
        style={[
          styles.footerActions,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <CustomButton
          title="Request Additional Info"
          style={styles.actionBtn}
          onPress={() => setModalVisible(true)}
          iconName="pending-actions"
          iconColor="#fff"
        />
        <CustomButton
          title="Mark As Resolved"
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={() => setResolveModalVisible(true)}
          iconName="check-circle"
          iconColor="#fff"
        />
      </View>
      <ActionModal
        visible={isResolveModalVisible}
        onClose={() => {
          if (!isResolving) {
            setResolveModalVisible(false);
          }
        }}
        onContinue={handleSetResolved}
        title="Resolve Ticket"
        subtitle="Are you sure this issue is completely resolved?"
        continueText="Resolve"
        loading={isResolving}
      />

      {/* SEND NOTIFICATION MODAL */}
      <SendNotificationModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        ticket={ticketDetails}
        navigation={navigation}
      />
      <EditUserModalContent
        visible={isEditModalVisible}
        user={affectedUser}
        onClose={() => {
          setEditModalVisible(false);
        }}
        onUserUpdated={updatedUser => {
          setAffectedUser(updatedUser);
          setEditModalVisible(false);
          setAffectedUser(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: { flex: 1, position: 'relative' },
  scrollContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingBottom: 40,
    paddingHorizontal: 15,
  },
  thread: { marginTop: 12, gap: 8 },
  threadSender: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  section: { padding: 15, borderRadius: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  textLabel: { fontSize: 12 },
  messageBox: { padding: 10, borderRadius: 8, borderLeftWidth: 2 },
  footerActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: { paddingHorizontal: 15, width: 'auto' },
  btnText: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { padding: 20, borderRadius: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    alignItems: 'center',
  },
  sendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 16,
  },
  rowBetweenDiv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryText: { marginBottom: 15, fontSize: 14, fontWeight: 'bold' },
  messageText: { fontSize: 14, fontWeight: 'bold' },
  userDetailsIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  userDetails: { flex: 1 },
  suspensionDiv: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  suspensionText: { marginLeft: 5, fontWeight: 'bold', fontSize: 14 },
});