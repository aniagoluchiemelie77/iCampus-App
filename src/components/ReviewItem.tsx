import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {Review, UserTier} from '../types/firebase';
import { UserAvatar } from './UserAvatar'; 
import { UserIdentity } from './UserIdentity';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';

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
    }
  };
}

export const ReviewItem = ({ review }: ReviewItemProps) => {
  const { reviewerDetails } = review;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* 1. Reviewer Identity */}
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
                {[1, 2, 3, 4, 5].map((star) => {
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
                            color={PRIMARY_COLOR}
                            style={{ marginRight: 1 }}
                        />
                    );
                })}
            </View>
        </View>
      </View>
      <View style={styles.contentBody}>
        <Text style={styles.commentText}>{review.comment}</Text>
        {review.attributes && (
           <View style={styles.attributeRow}>
              {review.attributes.deliverySpeed && (
                <View style={styles.attrBadge}>
                  <Text style={styles.attrLabel}>Delivery: {review.attributes.deliverySpeed}/5</Text>
                </View>
              )}
              {review.attributes.accuracy && (
                <View style={styles.attrBadge}>
                  <Text style={styles.attrLabel}>Accuracy: {review.attributes.accuracy}/5</Text>
                </View>
              )}
           </View>
        )}
        <Text style={styles.dateText}>{new Date(review.createdAt).toLocaleDateString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fadccc',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: PRIMARY_COLOR_TINT,
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
    alignItems: 'center'
  },
  dateText: {
    fontSize: 11,
    marginTop: 4,
    width: '100%',
    color: PRIMARY_COLOR_TINT,
    fontWeight: '500',
  },
  contentBody: {
    marginTop: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#444',
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
    borderRadius: 20,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  attrLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
});