import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '../components/PageHeader';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
import { useAppDataContext } from '../context/EventContext';

dayjs.extend(relativeTime);

export const ViewAllSupportInquiriesScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { emailSupportTickets, isEmailSupportLoading, fetchEmailSupportTickets } = useAppDataContext();
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    fetchEmailSupportTickets();
  }, [fetchEmailSupportTickets]);

  // Filter tickets based on the active tab selection
  const filteredTickets = emailSupportTickets.filter((ticket: any) => {
    if (activeTab === 'open') return ticket.status === 'open' || ticket.status === 'pending';
    if (activeTab === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
    return true; // 'all'
  });

  const handleTicketPress = (ticket: any) => {
    // Navigate individually to the chat/detail screen using the inquiry reference ID
    navigation.navigate('SupportChatScreen', {
      ticketRefId: ticket.ticketRefId,
      senderEmail: ticket.guestEmail || ticket.userId,
    });
  };

  const tabs: ('all' | 'open' | 'resolved')[] = ['all', 'open', 'resolved'];

  // Helper generator for initials avatar if sender image is unavailable
  const getAvatarUrl = (email: string) => {
    const cleanEmail = email ? email.trim().toLowerCase() : 'support@useicampus.io';
    const name = cleanEmail.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Support Inquiries" />

      {/* Filter Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.backgroundSecondary }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && { borderBottomColor: PRIMARY_COLOR }]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.primary : colors.text },
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEmailSupportLoading && emailSupportTickets.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={item => item.ticketRefId}
          renderItem={({ item }) => {
            const lastMessage = item.thread?.[item.thread.length - 1]?.message || item.originalMessage;
            const senderEmail = item.guestEmail || item.userId;
            const isOpen = item.status === 'open' || item.status === 'pending';

            return (
              <TouchableOpacity
                style={[styles.ticketCard, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => handleTicketPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.senderInfo}>
                    <Image
                      source={{ uri: getAvatarUrl(senderEmail) }}
                      style={styles.avatar}
                    />
                    <View style={styles.senderTextContainer}>
                      <Text style={[styles.senderEmail, { color: colors.primary }]} numberOfLines={1}>
                        {senderEmail}
                      </Text>
                      <Text style={[styles.ticketIdText, { color: colors.text }]} numberOfLines={1}>
                        Ref: {item.ticketRefId}
                      </Text>
                    </View>
                  </View>

                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: isOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }
                  ]}>
                    <Text style={[
                      styles.statusText, 
                      { color: isOpen ? '#EF4444' : '#10B981' }
                    ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.subjectText, { color: colors.primary }]} numberOfLines={1}>
                  {item.summary || 'External Support Inquiry'}
                </Text>

                <Text style={[styles.messageSnippet, { color: colors.text }]} numberOfLines={2}>
                  {lastMessage}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={[styles.timestampText, { color: colors.text }]}>
                    {dayjs(item.updatedAt || item.createdAt).fromNow()}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.text} />
                </View>
              </TouchableOpacity>
            );
          }}
          refreshing={isEmailSupportLoading}
          onRefresh={fetchEmailSupportTickets}
          ListEmptyComponent={
            <EmptyState
              iconName="mail-outline"
              title="No Support Inquiries"
              subtitle="All clean! There are no external emails or inquiries matching this filter."
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingBottom: 20 },
  ticketCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  senderTextContainer: {
    flex: 1,
  },
  senderEmail: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ticketIdText: {
    fontSize: 11,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageSnippet: {
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 8,
  },
  timestampText: {
    fontSize: 11,
    opacity: 0.6,
  },
});
