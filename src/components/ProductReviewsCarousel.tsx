import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './UserAvatar';
import { StarRow, ratingTone } from './ReviewItem';
import { safeParseDate } from '../utils/dateFormatter';
import { fetchProductReviewsAPI, ProductReview } from '../api/localGetApis';
import { ReviewSummary } from '../types/firebase';
import { formatStatNumber } from '../utils/followCountFormatter';

const CARD_WIDTH = 236;
const CARD_GAP = 12;
/** Marquee speed in pixels per second. */
const SPEED = 28;

const ReviewCard = ({ review }: { review: ProductReview }) => {
  const { colors } = useTheme();
  const reviewer = review.reviewerDetails || ({} as ProductReview['reviewerDetails']);
  const name =
    reviewer.organizationName ||
    [reviewer.firstname, reviewer.lastname].filter(Boolean).join(' ') ||
    'iCampus user';
  const date = safeParseDate(review.createdAt);
  const comment = (review.comment || '').trim();

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.cardTop}>
        <UserAvatar
          profilePic={reviewer.profilePic || undefined}
          firstName={reviewer.firstname}
          lastName={reviewer.lastname}
          organizationName={reviewer.organizationName || undefined}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textDarker }]} numberOfLines={1}>
              {name}
            </Text>
            {reviewer.isVerified && (
              <MaterialIcons name="verified" size={13} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.date, { color: colors.text }]}>
            {date ? moment(date).fromNow() : 'Recently'}
          </Text>
        </View>
      </View>
      <StarRow rating={review.rating} size={14} color={ratingTone(review.rating, colors)} />
      <Text
        style={[styles.comment, { color: comment ? colors.text : colors.inputTextHolder }]}
        numberOfLines={3}
      >
        {comment ? `“${comment}”` : 'Rated without a comment.'}
      </Text>
      {review.isVerifiedPurchase && (
        <View style={[styles.purchaseBadge, { backgroundColor: colors.success + '18' }]}>
          <MaterialIcons name="shopping-bag" size={11} color={colors.success} />
          <Text style={[styles.purchaseText, { color: colors.success }]}>Verified purchase</Text>
        </View>
      )}
    </View>
  );
};

/**
 * Product reviews as a continuously scrolling row. The list is rendered twice
 * side by side and slid left by exactly one copy's width, then reset, so the
 * end flows seamlessly back into the beginning. Touching the row pauses it.
 */
export const ProductReviewsCarousel = ({ productId }: { productId: string }) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const position = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProductReviewsAPI(productId, 20, controller.signal).then(res => {
      if (controller.signal.aborted) return;
      setReviews(res.data);
      setSummary(res.summary);
      setLoaded(true);
    });
    return () => controller.abort();
  }, [productId]);

  const loopWidth = reviews.length * (CARD_WIDTH + CARD_GAP);
  // Only scroll when the cards don't all fit on screen already.
  const shouldScroll = reviews.length > 1 && loopWidth > screenWidth - 30;

  useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      position.current = value;
    });
    return () => translateX.removeListener(id);
  }, [translateX]);

  const run = useCallback(
    (from: number) => {
      if (!shouldScroll) return;
      translateX.setValue(from);
      const remaining = loopWidth + from; // from is 0 … -loopWidth
      animation.current = Animated.timing(translateX, {
        toValue: -loopWidth,
        duration: (remaining / SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animation.current.start(({ finished }) => {
        if (finished) run(0);
      });
    },
    [shouldScroll, loopWidth, translateX],
  );

  useEffect(() => {
    run(0);
    return () => animation.current?.stop();
  }, [run]);

  const pause = () => animation.current?.stop();
  const resume = () => run(position.current);

  if (!loaded || reviews.length === 0) return null;

  const total = summary?.total ?? reviews.length;
  const avg =
    summary?.averageRating ??
    reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
  const items = shouldScroll ? [...reviews, ...reviews] : reviews;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.heading, { color: colors.textDarker }]}>Customer reviews</Text>
          <View style={styles.summaryRow}>
            <StarRow rating={avg} size={14} color={ratingTone(avg, colors)} />
            <Text style={[styles.summaryText, { color: colors.text }]}>
              {avg.toFixed(1)} · {formatStatNumber(total)} {total === 1 ? 'review' : 'reviews'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.viewport}>
        <Pressable onPressIn={pause} onPressOut={resume}>
          <Animated.View
            style={[
              styles.track,
              { transform: [{ translateX: shouldScroll ? translateX : 0 }] },
            ]}
          >
            {items.map((review, i) => (
              <ReviewCard key={`${review.id}-${i}`} review={review} />
            ))}
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 6, marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  heading: { fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  summaryText: { fontSize: 12.5, fontWeight: '600', opacity: 0.8 },
  // Bleeds to the screen edges past the screen's 15px padding.
  viewport: { overflow: 'hidden', marginHorizontal: -15, paddingVertical: 4 },
  track: { flexDirection: 'row', gap: CARD_GAP, paddingLeft: 15 },
  card: {
    width: CARD_WIDTH,
    minHeight: 150,
    borderRadius: 18,
    padding: 14,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 13.5, fontWeight: '800', flexShrink: 1 },
  date: { fontSize: 11, opacity: 0.65, marginTop: 1 },
  comment: { fontSize: 13, lineHeight: 19 },
  purchaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 'auto',
  },
  purchaseText: { fontSize: 10.5, fontWeight: '800' },
});
