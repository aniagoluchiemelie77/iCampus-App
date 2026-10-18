import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { formatDistanceToNowStrict } from 'date-fns';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { Posts } from '../types/firebase';
import { formatCount, formatStatNumber } from '../utils/followCountFormatter';
import { formatPostDate, parseFirestoreDate } from '../utils/dateFormatter';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { UserIdentity } from './UserIdentity';
import { UserAvatar } from './UserAvatar';
import { ActionModal } from './LogoutModal';
import { useAppDataContext } from '../context/EventContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../hooks/useUserDetails';
import { LazyImage } from './LazyImage';
import { LazyRotatingImages } from './LazyRotatingImages';

export interface PostCardProps {
  post: Posts;
  isVisible?: boolean;
}

interface LinkedTextProps {
  content: string;
  onTagPress?: (tag: string) => void;
  onMentionPress?: (mention: string) => void;
  colors: any;
}

const TEXT_LIMIT = 180;

/**
 * Posts reach this component from three different sources (feed, search,
 * profile) that expose different id fields, so resolve the id defensively.
 */
export const getPostId = (post: any): string =>
  post?.postId || post?.id || post?._id || '';

const toText = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
};

const toArray = (value: any): any[] =>
  Array.isArray(value) ? value : value ? [value] : [];

/** Accepts Date, ISO string, Firestore Timestamp or {_seconds} shapes. */
const toSafeDate = (value: any): Date | null => {
  if (!value) return null;
  const parsed = parseFirestoreDate(value);
  return parsed && !isNaN(parsed.getTime()) ? parsed : null;
};

const compactRelativeTime = (value: any): string => {
  if (!value) return '';
  const iso = formatPostDate(value);
  if (!iso) return '';
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: false })
      .replace(/ seconds?/g, 's')
      .replace(/ minutes?/g, 'm')
      .replace(/ hours?/g, 'h')
      .replace(/ days?/g, 'd')
      .replace(/ months?/g, 'mo')
      .replace(/ years?/g, 'y');
  } catch (error) {
    return '';
  }
};

const eventMonthDay = (value: any): string => {
  const date = toSafeDate(value);
  if (!date) return '---';
  return `${date
    .toLocaleString('en-US', { month: 'short' })
    .toUpperCase()} ${date.getDate()}`;
};

const eventClockTime = (value: any): string => {
  const date = toSafeDate(value);
  if (!date) return '--:--';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const lastProfilePic = (profilePic: any): string | undefined => {
  const urls = toArray(profilePic);
  const uri = urls[urls.length - 1];
  return typeof uri === 'string' && uri ? uri : undefined;
};

/**
 * React Navigation refuses to carry class instances (Date), functions and
 * circular references through route params, which is what made tapping the
 * card throw. Send a plain-data snapshot plus the id so it can refetch.
 */
const sanitizePostForNavigation = (post: Posts): Posts | undefined => {
  try {
    return JSON.parse(JSON.stringify(post));
  } catch (error) {
    console.warn('Could not serialize post for navigation:', error);
    return undefined;
  }
};

export const MediaSection = ({ post, isVisible }: PostCardProps) => {
  const mediaUrls = useMemo(
    () =>
      toArray(post.media?.url).filter(
        (uri: any) => typeof uri === 'string' && uri,
      ),
    [post.media?.url],
  );
  const isVideo = post.media?.mediaType === 'video';

  // Lazy-mount the video player: the stream is only opened once the card has
  // been visible at least once, then kept mounted (paused) to keep position.
  const [hasActivatedVideo, setHasActivatedVideo] = useState(false);
  const isCurrentlyVisible = isVisible !== false;
  useEffect(() => {
    if (isCurrentlyVisible && !hasActivatedVideo) {
      setHasActivatedVideo(true);
    }
  }, [isCurrentlyVisible, hasActivatedVideo]);

  if (!mediaUrls.length) return null;

  return (
    <View style={styles.mediaContainer}>
      {isVideo && mediaUrls[0] && hasActivatedVideo && (
        <Video
          source={{ uri: mediaUrls[0] }}
          style={styles.postMedia}
          paused={!isVisible}
          repeat={true}
          muted={true}
          resizeMode="cover"
        />
      )}
      {!isVideo && mediaUrls.length > 1 && (
        <LazyRotatingImages
          urls={mediaUrls}
          paused={isVisible === false}
          showDots
          imageStyle={styles.postMedia}
        />
      )}
      {!isVideo && mediaUrls.length === 1 && (
        <LazyImage
          uri={mediaUrls[0]}
          style={styles.postMedia}
          visible={isCurrentlyVisible}
        />
      )}
    </View>
  );
};
const PollView = ({
  poll,
  currentUserId,
  postId,
  onVote,
  colors,
}: {
  poll: any;
  currentUserId: string;
  postId: string;
  onVote: (postId: string, optionId: string) => void;
  colors: any;
}) => {
  const options = toArray(poll?.options);
  const totalVotes = Number(poll?.totalVotes) || 0;
  const hasVoted = options.some((opt: any) =>
    toArray(opt?.votes).includes(currentUserId),
  );

  if (!options.length) return null;

  return (
    <View style={styles.pollContainer}>
      {options.map((option: any) => {
        const votes = toArray(option?.votes);
        const percentage =
          totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;

        const isMyVote = votes.includes(currentUserId);

        return (
          <TouchableOpacity
            key={option.optionId}
            style={[
              styles.optionButton,
              isMyVote && { backgroundColor: colors.btnColor },
              { borderColor: colors.primary },
            ]}
            disabled={hasVoted}
            onPress={() => onVote(postId, option.optionId)}
          >
            {hasVoted && (
              <View
                style={[
                  styles.progressBg,
                  {
                    width: `${percentage}%`,
                    backgroundColor: colors.primaryTint,
                  },
                ]}
              />
            )}
            <View style={styles.optionContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={[
                    styles.optionText,
                    isMyVote
                      ? { fontWeight: 'bold', color: colors.btnTextColor }
                      : { color: colors.text },
                  ]}
                >
                  {toText(option?.text)}
                </Text>
              </View>
              {hasVoted && (
                <Text
                  style={[styles.percentageText, { color: colors.primary }]}
                >
                  {percentage}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.pollFooter}>
        <Text style={[styles.voteCount, { color: colors.text }]}>
          {formatCount(totalVotes)} votes
        </Text>
        <Text style={[styles.pollStatus, { color: colors.primary }]}>
          {hasVoted ? 'Final results' : 'Voting ongoing'}
        </Text>
      </View>
    </View>
  );
};
const formatDisplayUrl = (url: string): string => {
  let cleanPath = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  const slashIndex = cleanPath.indexOf('/');
  if (slashIndex === -1 || slashIndex === cleanPath.length - 1) {
    return 'icps.link/visit';
  }
  let path = cleanPath.slice(slashIndex + 1);
  path = path.split('?')[0];
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  if (path.length > 7) {
    path = `${path.slice(0, 7)}...`;
  }
  return `icps.link/${path.toLowerCase()}`;
};
export const LinkedText = ({
  content,
  onTagPress,
  onMentionPress,
  colors,
}: LinkedTextProps) => {
  const text = toText(content);
  if (!text) return null;

  const regex = /((?:https?:\/\/|www\.)[^\s]+|#\w+|@\w+)/g;
  const parts = text.split(regex);

  const handleLinkPress = async (url: string) => {
    const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      }
    } catch (err) {
      console.error('Failed to open parsed deep link interaction:', err);
    }
  };
  return (
    <Text style={[styles.baseText, { color: colors.text }]}>
      {parts.map((part, index) => {
        if (part.match(/^(https?:\/\/|www\.)/i)) {
          return (
            <Text
              key={`url-${index}`}
              style={[styles.link, { color: colors.primary }]}
              onPress={() => handleLinkPress(part)}
            >
              {formatDisplayUrl(part)}
            </Text>
          );
        }
        if (part.startsWith('#')) {
          return (
            <Text
              key={`tag-${index}`}
              style={[styles.hashtag, { color: colors.primary || '#0A66C2' }]}
              onPress={() => onTagPress?.(part)}
            >
              {part}
            </Text>
          );
        }
        if (part.startsWith('@')) {
          return (
            <Text
              key={`mention-${index}`}
              style={[
                styles.mention,
                { color: colors.primary, fontWeight: '600' },
              ]}
              onPress={() => onMentionPress?.(part)}
            >
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};
export const PostCard = React.memo(
  ({ post, isVisible }: PostCardProps) => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const {
      toggleLike,
      toggleBookmark,
      currentUser,
      handleRepost,
      incrementShareCount,
      handleVote,
      handleDeletePost,
      isDeletingPost,
    } = useAppDataContext();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const originalAuthor = post?.originalAuthor;
    const targetPostId = getPostId(post);
    const { user: poster } = useUser(originalAuthor);

    const likes = toArray(post?.likes);
    const bookmarks = toArray(post?.bookmarks);
    const reposters = toArray(post?.repostersDetails);
    const isOwner = !!currentUser?.uid && currentUser.uid === originalAuthor;
    const isLiked = likes.includes(currentUser?.uid);
    const isBookmarked = bookmarks.includes(currentUser?.uid);

    // Reset transient UI when the FlatList reuses this cell for another post.
    useEffect(() => {
      setIsExpanded(false);
      setIsNavigating(false);
    }, [targetPostId]);

    const content = toText(post?.content);
    const shouldShowSeeMore = content.length > TEXT_LIMIT;
    const displayText = isExpanded ? content : content.slice(0, TEXT_LIMIT);
    const relativeTime = compactRelativeTime(post?.createdAt);
    const deepLinkUrl = `https://useicampus.io/posts/${targetPostId}`;

    const authorDetails = post?.postAuthorsDetails ?? poster;
    const displayUser = post?.featuredReposter;
    const authorProfilePic =
      lastProfilePic(authorDetails?.profilePic) ??
      lastProfilePic(poster?.profilePic);

    const openPostDetails = useCallback(() => {
      if (!targetPostId || isNavigating) return;
      setIsNavigating(true);
      try {
        navigation.navigate('PostDetailScreen', {
          postId: targetPostId,
          post: sanitizePostForNavigation(post),
        });
      } catch (error) {
        console.error('Failed to open post details:', error);
        Toast.show({ type: 'error', text1: 'Could not open this post' });
      }
    }, [navigation, post, targetPostId, isNavigating]);

    const handleToggleLike = useCallback(() => {
      if (!targetPostId || !currentUser?.uid) {
        Toast.show({
          type: 'error',
          text2: 'Please sign in to react to posts',
        });
        return;
      }
      toggleLike(targetPostId);
    }, [currentUser?.uid, targetPostId, toggleLike]);

    const handleToggleBookmark = useCallback(() => {
      if (!targetPostId || !currentUser?.uid) {
        Toast.show({ type: 'error', text2: 'Please sign in to save posts' });
        return;
      }
      toggleBookmark(targetPostId);
    }, [currentUser?.uid, targetPostId, toggleBookmark]);

    const handleToggleRepost = useCallback(() => {
      if (!targetPostId || !currentUser?.uid) {
        Toast.show({ type: 'error', text2: 'Please sign in to repost' });
        return;
      }
      handleRepost(targetPostId);
    }, [currentUser?.uid, targetPostId, handleRepost]);

    const handleCopyLink = () => {
      Clipboard.setString(deepLinkUrl);
      setIsMenuVisible(false);
      Toast.show({ type: 'success', text2: 'Link copied to clipboard!' });
    };

    const handleExternalShare = async () => {
      try {
        const result = await Share.share({
          message: `${content || 'Check out this post on iCampus!'} \n\nView more on iCampus App!`,
          url: deepLinkUrl,
        });

        if (result.action === Share.sharedAction) {
          incrementShareCount(targetPostId);
        }
      } catch (error) {
        console.error('Failed to share post:', error);
        Toast.show({ type: 'error', text2: 'Could not open the share sheet' });
      }
    };
    const handleEditNavigate = () => {
      setIsMenuVisible(false);
      navigation.navigate('CreatePost', { post: post, postId: targetPostId });
    };
    const handleJobApply = (url: string) => {
      Alert.alert(
        'Leaving iCampus',
        'You are being redirected to an external site to complete your application.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => Linking.openURL(url) },
        ],
      );
    };
    const eventDate = post?.eventMetadata?.date
      ? eventMonthDay(post.eventMetadata.date)
      : 'Not specified';
    const eventTime = post?.eventMetadata?.startTime
      ? eventClockTime(post.eventMetadata.startTime)
      : '--:--';

    return (
      <Pressable
        onLongPress={() => setIsMenuVisible(true)}
        onPress={openPostDetails}
        delayLongPress={400}
        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
        style={[
          styles.container,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {post.isRepost && (
          <View style={styles.repostHeader}>
            <MaterialIcons
              name="repeat"
              size={13}
              color={colors.text}
              style={{ marginRight: 6, opacity: 0.7 }}
            />
            <UserIdentity
              firstname={displayUser?.firstname ?? ''}
              lastname={displayUser?.lastname ?? ''}
              username={displayUser?.username ?? ''}
              tier={displayUser?.tier ?? 'free'}
              organizationName={displayUser?.organizationName}
              size={'small'}
            />
          </View>
        )}
        <View style={styles.header}>
          <UserAvatar
            profilePic={authorProfilePic}
            firstName={authorDetails?.firstname}
            lastName={authorDetails?.lastname}
            organizationName={authorDetails?.organizationName}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <UserIdentity
              firstname={authorDetails?.firstname ?? ''}
              lastname={authorDetails?.lastname ?? ''}
              tier={
                authorDetails?.tier === 'pro' ||
                authorDetails?.tier === 'premium'
                  ? authorDetails.tier
                  : 'free'
              }
              isVerified={authorDetails?.isVerified}
              isOrganization={authorDetails?.organizationName ? true : false}
              organizationName={authorDetails?.organizationName}
              size="small"
            />
            <View style={styles.metaRow}>
              {!!relativeTime && (
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  {relativeTime}
                </Text>
              )}
              {isOwner && (
                <View
                  style={[
                    styles.ownerTag,
                    { backgroundColor: colors.primaryTint },
                  ]}
                >
                  <Text
                    style={[styles.ownerTagText, { color: colors.primary }]}
                  >
                    You
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.contentContainer}>
          {post.postType === 'job' && (
            <View
              style={[
                styles.jobCardBanner,
                { backgroundColor: colors.background },
              ]}
            >
              <Text
                style={[styles.jobTitleLarge, { color: colors.textDarker }]}
                numberOfLines={2}
              >
                {toText(post.jobMetadata?.title)}
              </Text>
              <Text style={[styles.jobCompanySub, { color: colors.text }]}>
                {`${toText(post.jobMetadata?.company)} • ${toText(
                  post.jobMetadata?.location,
                )}`}
              </Text>
              {!!post.jobMetadata?.salaryRange && (
                <Text style={[styles.jobSalary, { color: colors.primary }]}>
                  {toText(post.jobMetadata?.salaryRange)}
                </Text>
              )}
            </View>
          )}
          {post.postType === 'event' && (
            <View
              style={[
                styles.eventHeaderRow,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.calendarMini}>
                <MaterialIcons
                  name="calendar-month"
                  size={18}
                  color={colors.primary}
                  style={{ marginBottom: 2 }}
                />
                <Text style={[styles.calMonth, { color: colors.primary }]}>
                  {eventDate}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[styles.eventTitleText, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {toText(post.eventMetadata?.title)}
                </Text>
                <Text
                  style={[styles.eventLocationText, { color: colors.text }]}
                >
                  {`${eventTime} • ${toText(post.eventMetadata?.location)}`}
                </Text>
              </View>
            </View>
          )}
          <LinkedText
            content={displayText ?? ''}
            colors={colors}
            onTagPress={(tag: string) => {
              const cleanTag = tag.replace('#', '');
              console.log('Hashtag tapped:', cleanTag);
            }}
            onMentionPress={(mention: string) => {
              const identifier = mention.replace('@', '');
              try {
                navigation.navigate('Profile', { identifier });
              } catch (error) {
                console.error('Failed to open mentioned profile:', error);
              }
            }}
          />
          {shouldShowSeeMore && (
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => setIsExpanded(!isExpanded)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                {isExpanded ? 'Show less' : 'See more'}
              </Text>
            </TouchableOpacity>
          )}
          {post.postType === 'job' && post.jobMetadata?.applicationLink && (
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => handleJobApply(post.jobMetadata!.applicationLink)}
            >
              <Text
                style={[
                  styles.primaryActionText,
                  { color: colors.btnTextColor },
                ]}
              >
                Apply Now
              </Text>
              <MaterialIcons
                name="launch"
                size={16}
                color={colors.btnTextColor}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          )}
          {post.postType === 'event' && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.rsvpButtonOutline,
                { borderColor: colors.primary },
              ]}
              onPress={openPostDetails}
            >
              <Text style={[styles.rsvpText, { color: colors.primary }]}>
                View Event Details
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {post.poll ? (
          <PollView
            poll={post.poll}
            currentUserId={currentUser?.uid}
            postId={targetPostId}
            onVote={handleVote}
            colors={colors}
          />
        ) : (
          <MediaSection post={post} isVisible={isVisible} />
        )}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.statGroup}
            activeOpacity={0.6}
            onPress={openPostDetails}
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={19}
              color={colors.primary}
            />
            <Text style={[styles.statText, { color: colors.text }]}>
              {formatStatNumber(post.commentsCount ?? 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            activeOpacity={0.6}
            onPress={handleToggleLike}
          >
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={19}
              color={isLiked ? '#FF3B30' : colors.primary}
            />
            <Text
              style={[
                styles.statText,
                { color: isLiked ? '#FF3B30' : colors.text },
              ]}
            >
              {formatStatNumber(likes.length)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            activeOpacity={0.6}
            onPress={handleToggleRepost}
          >
            <MaterialIcons
              name="repeat"
              size={19}
              color={post.isRepost ? colors.success : colors.primary}
            />
            <Text style={[styles.statText, { color: colors.text }]}>
              {formatStatNumber(reposters.length)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            activeOpacity={0.6}
            onPress={handleToggleBookmark}
          >
            <MaterialIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-border'}
              size={19}
              color={colors.primary}
            />
            <Text style={[styles.statText, { color: colors.text }]}>
              {formatStatNumber(bookmarks.length)}
            </Text>
          </TouchableOpacity>
          <View style={styles.statGroup}>
            <MaterialIcons name="bar-chart" size={19} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {formatStatNumber(post.impressions || 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.shareIconContainer}
            activeOpacity={0.6}
            onPress={handleExternalShare}
          >
            <MaterialIcons name="share" size={19} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Modal
          visible={isVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.backdrop}
            onPress={() => setIsMenuVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.sheetContainer,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={styles.dragIndicator} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleCopyLink}
              >
                <MaterialIcons name="link" size={22} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  Copy link
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleExternalShare}
              >
                <MaterialIcons name="share" size={22} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  Share via...
                </Text>
              </TouchableOpacity>
              {isOwner && (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleEditNavigate}
                  >
                    <MaterialIcons name="edit" size={22} color={colors.text} />
                    <Text style={[styles.menuText, { color: colors.text }]}>
                      Edit post
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setIsMenuVisible(false);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={22}
                      color={colors.primary}
                    />
                    <Text style={[styles.menuText, { color: colors.primary }]}>
                      Delete post
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
        <ActionModal
          visible={deleteModalVisible}
          onClose={() => {
            if (!isDeletingPost) setDeleteModalVisible(false);
          }}
          onContinue={async () => {
            try {
              await handleDeletePost(targetPostId);
            } catch {
              // Error toast is already shown by handleDeletePost.
            } finally {
              setDeleteModalVisible(false);
            }
          }}
          title="Delete Post?"
          subtitle="Are you sure you want to delete this post? This action cannot be undone."
          continueText="Delete"
          loading={isDeletingPost}
        />
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    const prev = prevProps.post;
    const next = nextProps.post;
    return (
      getPostId(prev) === getPostId(next) &&
      toArray(prev?.likes).length === toArray(next?.likes).length &&
      toArray(prev?.bookmarks).length === toArray(next?.bookmarks).length &&
      prev?.commentsCount === next?.commentsCount &&
      prev?.poll === next?.poll &&
      prev?.isRepost === next?.isRepost &&
      prevProps.isVisible === nextProps.isVisible
    );
  },
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ownerTag: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  ownerTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
  },
  contentContainer: {
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
  },
  seeMoreText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  shareIconContainer: {
    padding: 4,
  },
  jobSalary: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  optionButtonSelected: {
    borderWidth: 1.5,
  },
  jobCardBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 10,
  },
  jobTitleLarge: {
    fontSize: 15,
    fontWeight: '700',
  },
  jobCompanySub: {
    fontSize: 13,
    marginTop: 4,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  calendarMini: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    minWidth: 55,
  },
  calMonth: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventLocationText: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  primaryActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryActionText: {
    fontWeight: '700',
    fontSize: 14,
  },
  rsvpButtonOutline: {
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  rsvpText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    width: '100%',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  menuText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
  },
  mediaContainer: {
    width: '100%',
    height: 280,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    overflow: 'hidden',
    marginVertical: 10,
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  pollContainer: {
    marginVertical: 12,
    width: '100%',
  },
  optionButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  progressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    opacity: 0.15,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  voteCount: {
    fontSize: 12,
    opacity: 0.7,
  },
  pollStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  baseText: {
    fontSize: 14,
    lineHeight: 22,
  },
  link: {
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  hashtag: {
    fontWeight: '600',
  },
  mention: {
    fontWeight: '600',
  },
});
