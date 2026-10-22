import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { Review, UserTier } from '../types/firebase';
import { UserAvatar } from './UserAvatar';
import { UserIdentity } from './UserIdentity';
import { LazyImage } from './LazyImage';
import { useTheme } from '../context/ThemeContext';
import { safeParseDate } from '../utils/dateFormatter';

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

const COMMENT_LIMIT = 180;

const SUBJECT_META: Record<string, { icon: string; label: string }> = {
  product: { icon: 'shopping-bag', label: 'Product' },
  course: { icon: 'school', label: 'Course' },
  file: { icon: 'description', label: 'Digital file' },
  seller: { icon: 'storefront', label: 'Store' },
  agent: { icon: 'local-shipping', label: 'Delivery' },
  lecturer: { icon: 'person', label: 'Lecturer' },
};

const ATTRIBUTE_LABELS: { key: 'deliverySpeed' | 'accuracy' | 'clarity'; label: string; icon: string }[] = [
  { key: 'deliverySpeed', label: 'Delivery', icon: 'local-shipping' },
  { key: 'accuracy', label: 'As described', icon: 'fact-check' },
  { key: 'clarity', label: 'Communication', icon: 'forum' },
];

export const ratingTone = (rating: number, colors: any) =>
  rating >= 4 ? colors.success : rating >= 3 ? colors.pendingDelivery || colors.primaryTint : colors.primary;

export const StarRow = ({ rating, size = 15, color }: { rating: number; size?: number; color: string }) => (
  <View style={styles.stars} accessibilityLabel={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(star => (
      <MaterialIcons
        key={star}
        name={rating >= star ? 'star' : rating > star - 1 ? 'star-half' : 'star-outline'}
        size={size}
        color={color}
      />
    ))}
  </View>
);

export const ReviewItem = ({ review }: ReviewItemProps) => {
  const { reviewerDetails, subject } = review;
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(false);

  const rating = Number(review.rating) || 0;
  const tone = ratingTone(rating, colors);
  const date = safeParseDate(review.createdAt);
  const relative = date ? moment(date).fromNow() : '';
  const comment = (review.comment || '').trim();
  const isLong = comment.length > COMMENT_LIMIT;
  const media = (review.mediaUrls || []).filter(u => typeof u === 'string' && u);
  const attributes = ATTRIBUTE_LABELS.filter(a => Number(review.attributes?.[a.key]) > 0);

  const subjectMeta = SUBJECT_META[subject?.type || review.targetType] || SUBJECT_META.product;
  const canOpenSubject = !!subject?.id && subject.type !== 'seller';
  const subjectDetails = [
    subject?.variant,
    subject?.quantity ? `Qty ${subject.quantity}` : null,
    subject?.orderId ? `Order #${String(subject.orderId).slice(-6).toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
      ]}
    >
      {/* What was reviewed */}
      {!!subject && (
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={!canOpenSubject}
          onPress={() => navigation.navigate('ProductDetails', { productId: subject.id })}
          accessibilityRole={canOpenSubject ? 'button' : undefined}
          accessibilityLabel={`Review of ${subject.title}${canOpenSubject ? '. Open listing' : ''}`}
          style={[styles.subject, { backgroundColor: colors.background }]}
        >
          {subject.image ? (
            <LazyImage uri={subject.image} style={styles.subjectThumb} />
          ) : (
            <View style={[styles.subjectThumb, styles.subjectIcon, { backgroundColor: colors.primary + '1A' }]}>
              <MaterialIcons name={subjectMeta.icon} size={20} color={colors.primary} />
            </View>
          )}
          <View style={styles.subjectText}>
            <View style={styles.subjectLabelRow}>
              <Text style={[styles.subjectLabel, { color: colors.text }]}>
                {subject.isStoreReview ? 'STORE REVIEW · ' : 'REVIEWED · '}
                {subjectMeta.label.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.subjectTitle, { color: colors.textDarker }]} numberOfLines={1}>
              {subject.title}
            </Text>
            {!!subjectDetails && (
              <Text style={[styles.subjectMetaText, { color: colors.text }]} numberOfLines={1}>
                {subjectDetails}
              </Text>
            )}
          </View>
          {canOpenSubject && (
            <MaterialIcons name="chevron-right" size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      )}

      {/* Reviewer + rating */}
      <View style={styles.topRow}>
        <UserAvatar
          profilePic={reviewerDetails?.profilePic}
          firstName={reviewerDetails?.firstname}
          lastName={reviewerDetails?.lastname}
          username={reviewerDetails?.username}
          style={styles.avatar}
        />
        <View style={styles.reviewerText}>
          <UserIdentity
            firstname={reviewerDetails?.firstname || 'Anonymous'}
            lastname={reviewerDetails?.lastname}
            isVerified={reviewerDetails?.isVerified}
            tier={reviewerDetails?.tier || 'free'}
            size="small"
            isOrganization={!!reviewerDetails?.organizationName}
            organizationName={reviewerDetails?.organizationName}
            containerStyle={styles.identity}
          />
          <View style={styles.starsLine}>
            <StarRow rating={rating} size={14} color={tone} />
            {!!relative && (
              <Text style={[styles.dateText, { color: colors.text }]}>· {relative}</Text>
            )}
          </View>
        </View>
        <View style={[styles.ratingPill, { backgroundColor: tone + '1A' }]}>
          <MaterialIcons name="star" size={14} color={tone} />
          <Text style={[styles.ratingPillText, { color: tone }]}>{rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Comment */}
      {comment ? (
        <Pressable onPress={() => isLong && setExpanded(v => !v)} disabled={!isLong}>
          <Text style={[styles.commentText, { color: colors.text }]}>
            {isLong && !expanded ? `${comment.slice(0, COMMENT_LIMIT).trimEnd()}…` : comment}
          </Text>
          {isLong && (
            <Text style={[styles.readMore, { color: colors.primary }]}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text style={[styles.noComment, { color: colors.text }]}>
          Left a {rating}-star rating without a comment.
        </Text>
      )}

      {/* Photos the buyer attached */}
      {media.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaRow}
        >
          {media.map(uri => (
            <LazyImage key={uri} uri={uri} style={styles.mediaThumb} />
          ))}
        </ScrollView>
      )}

      {/* Detailed ratings */}
      {attributes.length > 0 && (
        <View style={[styles.attributes, { borderTopColor: colors.border + '66' }]}>
          {attributes.map(attr => {
            const value = Math.min(5, Number(review.attributes?.[attr.key]) || 0);
            const attrTone = ratingTone(value, colors);
            return (
              <View key={attr.key} style={styles.attrRow}>
                <MaterialIcons name={attr.icon} size={14} color={colors.text} />
                <Text style={[styles.attrLabel, { color: colors.text }]}>{attr.label}</Text>
                <View style={[styles.attrTrack, { backgroundColor: colors.border + '88' }]}>
                  <View
                    style={[
                      styles.attrFill,
                      { width: `${(value / 5) * 100}%`, backgroundColor: attrTone },
                    ]}
                  />
                </View>
                <Text style={[styles.attrValue, { color: colors.textDarker }]}>{value}/5</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  subject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    marginBottom: 12,
  },
  subjectThumb: { width: 46, height: 46, borderRadius: 11 },
  subjectIcon: { alignItems: 'center', justifyContent: 'center' },
  subjectText: { flex: 1 },
  subjectLabelRow: { flexDirection: 'row', alignItems: 'center' },
  subjectLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, opacity: 0.6 },
  subjectTitle: { fontSize: 14.5, fontWeight: '800', marginTop: 2 },
  subjectMetaText: { fontSize: 11.5, marginTop: 2, opacity: 0.75 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  reviewerText: { flex: 1, marginLeft: 10, marginRight: 8 },
  identity: { flexShrink: 1 },
  starsLine: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  stars: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 11.5, marginLeft: 6, opacity: 0.7 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ratingPillText: { fontSize: 13, fontWeight: '800' },
  commentText: { fontSize: 14, lineHeight: 21, marginTop: 12 },
  readMore: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  noComment: { fontSize: 13, fontStyle: 'italic', marginTop: 12, opacity: 0.6 },
  mediaRow: { gap: 8, marginTop: 12 },
  mediaThumb: { width: 72, height: 72, borderRadius: 12 },
  attributes: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attrLabel: { fontSize: 12, fontWeight: '600', width: 98 },
  attrTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  attrFill: { height: '100%', borderRadius: 3 },
  attrValue: { fontSize: 12, fontWeight: '800', minWidth: 28, textAlign: 'right' },
});
