import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { NotificationItem } from '../components/NotificationItem';
import { updateTicketStatus } from '../api/localPatchApis';
import { adminFetchUserDetails, adminFetchUserNotifications } from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { PageHeader } from '@components/PageHeader';
import { UserAvatar } from '@components/UserAvatar';
import { UserIdentity } from '@components/UserIdentity';
import { EmptyState } from '@components/EmptyFlatlistComponent';
import { EditUserModalContent } from '@components/editUser';
import { SendNotificationModal } from '@components/sendNotificationComponent';

export const TicketResolveScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  
  const { ticket } = route.params; 

  const [affectedUser, setAffectedUser] = useState<any>(null);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    const loadContextData = async () => {
      try {
        const [userData, userNotifs] = await Promise.all([
          adminFetchUserDetails(ticket.userId),
          adminFetchUserNotifications(ticket.userId, 10),
        ]);
        setAffectedUser(userData);
        setRecentNotifications(userNotifs);
      } catch (error) {
        Toast.show({
            type: 'error',
            text2: 'Failed to load user context'
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadContextData();
  }, [ticket.userId]);

  const handleSetResolved = async () => {
    Alert.alert('Resolve Ticket', 'Are you sure this issue is completely resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        style: 'default',
        onPress: async () => {
          await updateTicketStatus(ticket.ticketRefId, 'resolved');
          navigation.goBack();
        },
      },
    ]);
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
      <View style={[styles.center, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader
            title="Support Ticket Details"
        />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TICKET DETAILS */}
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>Ticket Info</Text>
          <View style={styles.rowBetweenDiv}>
            <Text style={[styles.textLabel, { color: colors.text }]}>Ref: <Text style={{fontWeight: 'bold'}}>#{ticket.ticketRefId}</Text></Text>
            <Text style={[styles.textLabel, { color: colors.text }]}>{ticket.category.charAt(0).toUpperCase() + ticket.category.slice(1)}</Text>
            <Text style={[styles.textLabel, { color: getSeverityColor(ticket.severity) }]}> {ticket.severity.toUpperCase()}</Text>
          </View>
          {ticket.summary && (
            <Text style={[styles.summaryText, { color: colors.text}]}>{ticket.summary}</Text>
          )}
          {ticket.originalMessage && (
          <View style={[styles.messageBox, {borderLeftColor: colors.primary}]}>
            <Text style={[styles.messageText, { color: colors.text, fontStyle: 'italic'}]}>"{ticket.originalMessage}"</Text>
          </View>
          )}
        </View>

        {/* AFFECTED USER DETAILS */}
        {affectedUser && (
  <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
    <View style={styles.rowBetween}>
      <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>User Context</Text>
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
        <Text style={[styles.textLabel, { color: colors.text, marginVertical: 5 }]}>
          {affectedUser.email}
        </Text>
        <Text style={[styles.textLabel, { color: colors.text}]}>
          iScore: <Text style={{ fontWeight: 'bold' }}>{affectedUser.currentIScore || 0}</Text>
        </Text>
      </View>
    </View>
    {affectedUser.isSuspended && (
      <View style={styles.suspensionDiv}>
        <MaterialIcons name="info-outlined" size={16} color={colors.primary} /> 
        <Text style={[styles.suspensionText, {color: colors.primary}]}>
          ACCOUNT SUSPENDED
        </Text>
      </View>
    )}

  </View>
)}

        {/* RECENT ACTIVITY */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>User's Recent Activity</Text>
          {recentNotifications.length === 0 ? (
  <EmptyState
    iconName="notifications-off-outlined" 
    title="No Recent Notifications"
    subtitle="This user hasn't received any system or ticket alerts yet."
  />
) : (
  recentNotifications.map((notif) => (
    <NotificationItem 
      key={notif.notificationId} 
      item={notif} 
      handleNotificationPress={handleNotificationPress} 
    />
  ))
)}
        </View>

      </ScrollView>

      <View style={[styles.footerActions, { backgroundColor: colors.backgroundSecondary }]}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colors.btnColor }]} 
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="pending-actions-outlined" size={20} color={colors.btnTextColor} />
          <Text style={[styles.btnText, {color: colors.btnTextColor}]}>Request Additional Info</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: colors.success }]} 
          onPress={handleSetResolved}
        >
          <MaterialIcons name="check-circle-outlined" size={20} color={colors.btnTextColor} />
          <Text style={[styles.btnText, {color: colors.btnTextColor}]}>Mark As Resolved</Text>
        </TouchableOpacity>
      </View>

      {/* SEND NOTIFICATION MODAL */}
      <SendNotificationModal 
  visible={isModalVisible}
  onClose={() => setModalVisible(false)}
  ticket={ticket}
  navigation={navigation}
/>
      <EditUserModalContent
        visible={isEditModalVisible}
        user={affectedUser} 
        onClose={() => {
            setEditModalVisible(false);
        }}
        onUserUpdated={(updatedUser) => {
            setAffectedUser(updatedUser); 
            setEditModalVisible(false);
            setAffectedUser(null); 
        }}
    />

    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignContent: 'center', padding: 20 },
  container: { flex: 1, paddingHorizontal: 15 },
  scrollContent: { paddingBottom: 100 },
  section: { padding: 15, borderRadius: 15, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  textLabel: { fontSize: 12 },
  messageBox: { padding: 10, borderRadius: 8, borderLeftWidth: 2 },
  footerActions: { position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', flexDirection: 'row', padding: 15, justifyContent: 'space-between', alignItems: 'center'},
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15, borderRadius: 15, paddingVertical: 10 },
  btnText: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 20, borderRadius: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, textAlignVertical: 'top', marginTop: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, alignItems: 'center' },
  sendBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginLeft: 16 },
  rowBetweenDiv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryText: { marginBottom: 15, fontSize: 14, fontWeight: 'bold'},
  messageText: { fontSize: 14, fontWeight: 'bold'},
  userDetailsIcon: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 15 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  userDetails: { flex: 1 },
  suspensionDiv: { 
    alignItems: 'center' ,
    flexDirection: 'row'
    },
    suspensionText: {marginLeft: 5, fontWeight: 'bold', fontSize: 14 },
});