import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserIdentity } from './UserIdentity';
import { searchUsersByUid } from '../api/localGetApis';
import { useAppSelector } from '../components/hooks';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { UserAvatar } from './UserAvatar';
import { useTheme } from 'context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { formatCount } from '../utils/followCountFormatter';

export const CommentItem = ({ comment, onLike, onReply }: any) => {
  const { colors } = useTheme();
  const [userDetails, setUserDetails] = useState<any>(null);
  const currentUser = useAppSelector(state => state.user);

  useEffect(() => {
    const fetchUser = async () => {
      const data = await searchUsersByUid(
        comment.userId.uid,
        currentUser.tier!,
        currentUser.usertype!,
      );
      setUserDetails(data);
    };
    if (comment.userId?.uid) {
      fetchUser();
    }
  }, [comment.userId?.uid, currentUser?.tier, currentUser?.usertype]);

  const getProfilePic = () => {
    if (
      Array.isArray(userDetails?.profilePic) &&
      userDetails.profilePic.length > 0
    ) {
      return userDetails.profilePic[userDetails.profilePic.length - 1];
    }
    return typeof userDetails?.profilePic === 'string'
      ? userDetails.profilePic
      : '';
  };

  return (
    <View
      style={[
        styles.commentContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <View style={styles.row}>
        <UserAvatar
          profilePic={getProfilePic()}
          firstName={userDetails.firstname}
          lastName={userDetails.lastname}
          organizationName={userDetails.organizationName}
          style={styles.miniAvatar}
        />
        <View style={styles.textBubble}>
          {userDetails ? (
            <UserIdentity
              firstname={userDetails.firstname}
              lastname={userDetails.lastname}
              username={userDetails.username}
              tier={userDetails.tier}
              organizationName={userDetails.organizationName}
              isOrganization={!!userDetails.organizationName}
              size="small"
            />
          ) : (
            <Text style={styles.author}>Loading...</Text>
          )}
          <Text style={[styles.commentText, { color: colors.text }]}>
            {comment.comment}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => onLike(comment.commentId)}
          style={[styles.actionsBtn, { marginRight: 10 }]}
        >
          <MaterialIcons
            name={
              comment.likes?.includes(currentUser.uid)
                ? 'favorite'
                : 'favorite-outlined'
            }
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>
            ({formatCount(comment.likes?.length || 0)})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply(comment.commentId)}>
          <MaterialIcons
            name="comment-outlined"
            size={16}
            color={colors.primary}
          />
          <Text style={[styles.actionText, { color: colors.text }]}>Reply</Text>
        </TouchableOpacity>
      </View>
      {comment.replies?.length > 0 && (
        <View style={styles.replyThread}>
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.commentId}
              comment={reply}
              onLike={onLike}
              onReply={onReply}
            />
          ))}
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  commentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    padding: 4,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  textBubble: {
    flex: 1,
    marginLeft: 10,
  },
  author: {
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#222',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 5,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  replyThread: {
    marginLeft: 20,
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 1.5,
    borderLeftColor: PRIMARY_COLOR_TINT,
  },
  commentText: {
    fontSize: 14,
  },
  actionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
