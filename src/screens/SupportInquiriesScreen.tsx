import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PageHeader } from '../components/PageHeader';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { useTheme } from '../context/ThemeContext';
import { useAppDataContext } from '../context/EventContext';
import { UserAvatar } from '../components/UserAvatar';

dayjs.extend(relativeTime);

export const ViewAllSupportInquiriesScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const {
    emailSupportTickets,
    isEmailSupportLoading,
    fetchEmailSupportTickets,
    nextCursor,
    isFetchingMore,
  } = useAppDataContext();
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>(
    'all',
  );

  useEffect(() => {
    fetchEmailSupportTickets();
  }, [fetchEmailSupportTickets]);

  const filteredTickets = emailSupportTickets.filter((ticket: any) => {
    if (activeTab === 'open')
      return ticket.status === 'open' || ticket.status === 'pending';
    if (activeTab === 'resolved')
      return ticket.status === 'resolved' || ticket.status === 'closed';
    return true;
  });

  const handleTicketPress = (ticket: any) => {
    navigation.navigate('SupportChat', {
      ticketRefId: ticket.ticketRefId,
    });
  };
  const handleLoadMore = () => {
    if (isFetchingMore || isEmailSupportLoading || !nextCursor) return;

    fetchEmailSupportTickets(nextCursor, 15);
  };
  const handleRefresh = () => {
    fetchEmailSupportTickets('', 15);
  };

  const tabs: ('all' | 'open' | 'resolved')[] = ['all', 'open', 'resolved'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Support Inquiries" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[
          styles.tabContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.tabBar}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
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
      </ScrollView>

      {isEmailSupportLoading && emailSupportTickets.length === 0 ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={item => item.ticketRefId}
          renderItem={({ item }) => {
            const lastMessage =
              item.thread?.[item.thread.length - 1]?.message ||
              item.originalMessage;
            const senderEmail = item.guestEmail || item.userId;
            const isOpen = item.status === 'open' || item.status === 'pending';

            return (
              <TouchableOpacity
                style={[
                  styles.ticketCard,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => handleTicketPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.senderInfo}>
                    <UserAvatar firstName={senderEmail} style={styles.avatar} />
                    <View style={styles.senderTextContainer}>
                      <Text
                        style={[
                          styles.senderEmail,
                          { color: colors.textDarker },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {senderEmail}
                      </Text>
                      <Text
                        style={[styles.ticketIdText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        Ref: {item.ticketRefId}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge]}>
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isOpen
                            ? colors.pendingDelivery
                            : colors.success,
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
                {item.summary && (
                  <Text
                    style={[styles.subjectText, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.summary || 'External Support Inquiry'}
                  </Text>
                )}

                <Text
                  style={[styles.messageSnippet, { color: colors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {lastMessage}
                </Text>
                <Text style={[styles.timestampText, { color: colors.text }]}>
                  {dayjs(item.updatedAt || item.createdAt).fromNow()}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconName="email"
              title="No Support Inquiries"
              subtitle="All clean! There are no external emails or inquiries matching this filter."
            />
          }
          contentContainerStyle={styles.listContent}
          refreshing={isEmailSupportLoading}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingBottom: 30, marginHorizontal: 15 },
  ticketCard: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: PRIMARY_COLOR_TINT,
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
    marginTop: 3,
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageSnippet: {
    fontSize: 14,
    opacity: 0.85,
    marginBottom: 6,
  },
  timestampText: {
    fontSize: 11,
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
  tabContainer: {
    marginBottom: 20,
    marginHorizontal: 15,
  },
});
