import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {Review, UserTier} from '../types/firebase';
import { UserAvatar } from './UserAvatar'; 
import { UserIdentity } from './UserIdentity';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

interface ReviewItemProps {
  review: Review & {
    reviewerDetails?: {
      firstname: string;
      lastname: string;
      username: string;
      tier?: UserTier;
      organizationName?: string;
      profilePic?: string;
      isVerified?: boolean;
    };
  };
}

export const ReviewItem = ({ review }: ReviewItemProps) => {
  const { reviewerDetails } = review;
  const { colors } = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.topRow}>
        <View style={styles.userInfo}>
          <UserAvatar
            profilePic={reviewerDetails?.profilePic}
            firstName={reviewerDetails?.firstname}
            lastName={reviewerDetails?.lastname}
            username={reviewerDetails?.username}
            style={styles.avatar}
          />
          <UserIdentity
            firstname={reviewerDetails?.firstname || 'Anonymous'}
            lastname={reviewerDetails?.lastname}
            username={reviewerDetails?.username}
            isVerified={reviewerDetails?.isVerified}
            tier={reviewerDetails?.tier || 'free'}
            size="small"
            organizationName={reviewerDetails?.organizationName}
          />
        </View>
        <View style={styles.metaInfo}>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => {
              let iconName = 'star-outline';
              if (review.rating >= star) {
                iconName = 'star';
              } else if (review.rating > star - 1) {
                iconName = 'star-half';
              }
              return (
                <MaterialIcons
                  key={star}
                  name={iconName as any}
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 1 }}
                />
              );
            })}
          </View>
        </View>
      </View>
      <View style={styles.contentBody}>
        <Text style={[styles.commentText, { color: colors.text }]}>
          {review.comment}
        </Text>
        {review.attributes && (
          <View style={styles.attributeRow}>
            {review.attributes.deliverySpeed && (
              <View style={styles.attrBadge}>
                <Text style={[styles.attrLabel, { color: colors.text }]}>
                  Delivery: {review.attributes.deliverySpeed}/5
                </Text>
              </View>
            )}
            {review.attributes.accuracy && (
              <View style={styles.attrBadge}>
                <Text style={[styles.attrLabel, { color: colors.text }]}>
                  Accuracy: {review.attributes.accuracy}/5
                </Text>
              </View>
            )}
          </View>
        )}
        <Text style={[styles.dateText, { color: colors.text }]}>
          {new Date(review.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  metaInfo: {
    alignItems: 'flex-end',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    marginTop: 4,
    width: '100%',
    fontWeight: '500',
  },
  contentBody: {
    marginTop: 5,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  attributeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attrBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attrLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
});