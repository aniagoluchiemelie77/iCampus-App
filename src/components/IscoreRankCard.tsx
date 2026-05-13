import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RankCardProps } from 'types/firebase';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { UserAvatar } from './UserAvatar';

export const RankCard: React.FC<RankCardProps> = ({
  item,
  rank,
  userRole,
  navigation,
}) => {
  const diff = (item.currentIScore ?? 0) - (item.previousIScore ?? 0);
  const isStudent = userRole === 'student';
  const isRising = diff > 0;
  const isFalling = diff < 0;
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
      {rank <= 3 && (
        <View
          style={[styles.topRankBadge, { backgroundColor: getRankColor() }]}
        >
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      )}
      <View style={styles.avatarWrapper}>
        <UserAvatar
          profilePic={item.profilePic}
          firstName={item.firstname}
          lastName={item.lastname}
          style={styles.avatar}
        />
        {/* Trend Indicator */}
        {(isRising || isFalling) && (
          <View
            style={[
              styles.trendBadge,
              { backgroundColor: isRising ? '#4CAF50' : PRIMARY_COLOR },
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
        {isStudent ? item.department : item.jobTitle || 'iCampus User'}
      </Text>
      <View style={styles.iScoreContainer}>
        <Text style={styles.iScoreValue}>
          {Math.round(item.currentIScore || 0)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => {
          if (userRole === 'enterprise') {
            navigation.navigate('Chat', { recipientId: item.uid });
          } else {
            navigation.navigate('Profile', { uid: item.uid });
          }
        }}
      >
        <Text style={styles.actionBtnText}>
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
    height: 220,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    position: 'relative',
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
    zIndex: 5,
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
    borderColor: '#fadccc',
    position: 'relative'
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
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
    color: '#222',
    textAlign: 'center',
  },
  departmentText: {
    fontSize: 10,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 8,
    fontWeight: '500',
  },
  iScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fadccc',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  iScoreValue: {
    fontSize: 18,
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
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    borderRadius: 12,
    width: '100%',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
});