import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RankCardProps } from 'types/firebase';
import { PRIMARY_COLOR } from './Classroomcomponent';

export const RankCard: React.FC<RankCardProps> = ({
  item,
  rank,
  userRole,
  navigation,
}) => {
  const diff = (item.currentIScore ?? 0) - (item.previousIScore ?? 0);
  const isRising = diff > 0;
  const isFalling = diff < 0;

  // Modern UI: Assign colors based on rank
  const getRankColor = () => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7032';
    return 'transparent';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => navigation.navigate('Profile', { uid: item.uid })}
    >
      {/* Rank Badge */}
      {rank <= 3 && (
        <View
          style={[styles.topRankBadge, { backgroundColor: getRankColor() }]}
        >
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      )}

      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri: item.profilePic?.[0] || 'https://via.placeholder.com/150',
          }}
          style={styles.avatar}
        />
        {/* Trend Indicator */}
        {(isRising || isFalling) && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: isRising ? '#4CAF50' : '#FF5252' },
            ]}
          >
            <Icon
              name={isRising ? 'trending-up' : 'trending-down'}
              size={10}
              color="#FFF"
            />
          </View>
        )}
      </View>

      <Text style={styles.userName} numberOfLines={1}>
        {item.firstname} {item.lastname?.charAt(0)}.
      </Text>

      <Text style={styles.departmentText} numberOfLines={1}>
        {item.department || item.jobTitle || 'Member'}
      </Text>

      <View style={styles.iScoreContainer}>
        <Text style={styles.iScoreValue}>
          {Math.round(item.currentIScore || 0)}
        </Text>
        <Text style={styles.iScoreLabel}>iScore</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.actionBtn,
          userRole === 'enterprise' && styles.enterpriseBtn,
        ]}
        onPress={() => {
          if (userRole === 'enterprise') {
            navigation.navigate('Chat', { recipientId: item.uid });
          } else {
            navigation.navigate('Profile', { uid: item.uid });
          }
        }}
      >
        <Text
          style={[
            styles.actionBtnText,
            userRole === 'enterprise' && styles.enterpriseBtnText,
          ]}
        >
          {userRole === 'enterprise' ? 'Recruit' : 'Profile'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginRight: 14,
    width: 150,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    // Shadow
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  topRankBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
  avatarWrapper: {
    marginBottom: 10,
    padding: 3,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: '#F0F2F5',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F9FA',
  },
  trendBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 10,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1D1E',
    textAlign: 'center',
  },
  departmentText: {
    fontSize: 10,
    color: '#9BA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  iScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  iScoreValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_COLOR,
  },
  iScoreLabel: {
    fontSize: 9,
    color: '#676D75',
    marginLeft: 3,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionBtn: {
    backgroundColor: '#F0F4FF',
    paddingVertical: 8,
    borderRadius: 12,
    width: '100%',
  },
  actionBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  enterpriseBtn: {
    backgroundColor: PRIMARY_COLOR,
  },
  enterpriseBtnText: {
    color: '#FFF',
  },
});