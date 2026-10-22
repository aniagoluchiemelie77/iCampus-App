import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import { Posts } from '../types/firebase';
import { formatCount, formatStatNumber } from '../utils/followCountFormatter';
import { parseFirestoreDate } from '../utils/dateFormatter';
import { UserIdentity } from './UserIdentity';
import { UserAvatar } from './UserAvatar';
import { ActionModal } from './LogoutModal';
import { useAppDataContext } from '../context/EventContext';
import { useTheme } from '../context/ThemeContext';
import { LazyImage } from './LazyImage';
import { LazyRotatingImages } from './LazyRotatingImages';
import { usePostInteractions } from '../hooks/usePostInteractions';
import {
  compactRelativeTime,
  displayName,
  fullTimestamp,
  lastProfilePic,
  pollTiming,
  toArray,
  toNavigablePost,
} from '../utils/postHelpers';

export { getPostId } from '../utils/postHelpers';

export interface PostCardProps {
  post: Posts;
  /** Whether the card is the one currently in view (drives video/images). */
  isVisible?: boolean;
  /** "detail": full text, no tap-to-open, comment button focuses the composer. */
  variant?: 'feed' | 'detail';
  onCommentPress?: () => void;
}

const TEXT_LIMIT = 220;

const toText = (value: any): string =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

const eventDateParts = (value: any) => {
  if (!value) return { month: '---', day: '--' };
  const date = parseFirestoreDate(value);
  if (!date || isNaN(date.getTime())) return { month: '---', day: '--' };
  return {
    month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: String(date.getDate()),
  };
};
const eventClockTime = (value: any): string => {
  if (!value) return '--:--';
  const date = parseFirestoreDate(value);
  if (!date || isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------
export const MediaSection = ({
  post,
  isVisible,
}: {
  post: Posts;
  isVisible?: boolean;
}) => {
  const mediaUrls = useMemo(
    () =>
      toArray(post.media?.url).filter(
        (uri: any) => typeof uri === 'string' && uri,
      ) as string[],
    [post.media?.url],
  );
  const isVideo = post.media?.mediaType === 'video';
  // Mount the video player only once the card has been on screen, then keep
  // it (paused) so it doesn't restart.
  const [hasActivatedVideo, setHasActivatedVideo] = useState(false);
  const isCurrentlyVisible = isVisible !== false;
  useEffect(() => {
    if (isCurrentlyVisible && !hasActivatedVideo) setHasActivatedVideo(true);
  }, [isCurrentlyVisible, hasActivatedVideo]);

  if (!mediaUrls.length) return null;

  return (
    <View style={styles.mediaContainer}>
      {isVideo && hasActivatedVideo && (
        <Video
          source={{ uri: mediaUrls[0] }}
          style={styles.postMedia}
          paused={!isVisible}
          repeat
          muted
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
        <LazyImage uri={mediaUrls[0]} style={styles.postMedia} visible={isCurrentlyVisible} />
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Poll
// ---------------------------------------------------------------------------
const PollOptionRow = ({
  text,
  percentage,
  showResults,
  isMyVote,
  isWinner,
  locked,
  ended,
  onPress,
  colors,
}: {
  text: string;
  percentage: number;
  showResults: boolean;
  isMyVote: boolean;
  isWinner: boolean;
  locked: boolean;
  ended: boolean;
  onPress: () => void;
  colors: any;
}) => {
  const fill = useRef(new Animated.Value(showResults ? percentage : 0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: showResults ? percentage : 0,
      duration: 450,
      useNativeDriver: false, // animates width
    }).start();
  }, [fill, percentage, showResults]);

  const highlight = isMyVote || isWinner;
  return (
    // Always handles its own press, so a tap on a locked option never falls
    // through to the card and opens the post.
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isMyVote, disabled: locked }}
      accessibilityLabel={`${text}${showResults ? `, ${percentage} percent` : ''}${isMyVote ? ', your vote' : ''}`}
      style={({ pressed }) => [
        styles.optionButton,
        {
          borderColor: isMyVote ? colors.primary : colors.border,
          backgroundColor: colors.backgroundSecondary,
        },
        pressed && !locked && styles.optionPressed,
      ]}
    >
      {showResults && (
        <Animated.View
          style={[
            styles.progressBg,
            {
              width: fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: colors.primary,
              opacity: highlight ? 0.2 : 0.08,
            },
          ]}
        />
      )}
      <View style={styles.optionContent}>
        {!showResults && (
          <View style={[styles.radio, { borderColor: colors.primary }]} />
        )}
        <Text
          style={[
            styles.optionText,
            { color: colors.textDarker },
            highlight && styles.optionTextStrong,
          ]}
          numberOfLines={2}
        >
          {text}
        </Text>
        {isMyVote && (
          <MaterialIcons name="check-circle" size={16} color={colors.primary} style={styles.optionIcon} />
        )}
        {ended && isWinner && !isMyVote && (
          <MaterialIcons name="emoji-events" size={16} color={colors.primary} style={styles.optionIcon} />
        )}
        {showResults && (
          <Text style={[styles.percentageText, { color: highlight ? colors.primary : colors.textDarker }]}>
            {percentage}%
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const PollView = ({
  poll,
  currentUserId,
  hasVoted,
  onVote,
  colors,
}: {
  poll: any;
  currentUserId?: string;
  hasVoted: boolean;
  onVote: (optionId: string) => void;
  colors: any;
}) => {
  const options = toArray<any>(poll?.options);
  const totalVotes = Number(poll?.totalVotes) || 0;
  const { ended, label: timingLabel } = pollTiming(poll);
  if (!options.length) return null;

  // Results are shown once you've voted or the poll has closed; either way
  // the options stop accepting votes.
  const showResults = hasVoted || ended;
  const locked = showResults;
  const leading = Math.max(...options.map(o => toArray(o?.votes).length));

  const handlePress = (optionId: string) => {
    if (ended) {
      Toast.show({ type: 'info', text1: 'This poll has ended', text2: 'Voting is closed.' });
      return;
    }
    if (!hasVoted) onVote(optionId);
  };

  const status = ended ? 'Final results' : hasVoted ? 'You voted' : 'Tap an option to vote';

  return (
    <View style={[styles.pollContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={styles.pollHeader}>
        <MaterialIcons name="poll" size={16} color={colors.primary} />
        <Text style={[styles.pollTitle, { color: colors.textDarker }]}>Poll</Text>
        <View
          style={[
            styles.pollStatusChip,
            { backgroundColor: ended ? colors.border + '66' : colors.primary + '1A' },
          ]}
        >
          <View style={[styles.pollStatusDot, { backgroundColor: ended ? colors.text : colors.success }]} />
          <Text style={[styles.pollStatusText, { color: ended ? colors.text : colors.primary }]}>
            {ended ? 'Closed' : 'Open'}
          </Text>
        </View>
      </View>

      {options.map(option => {
        const votes = toArray(option?.votes);
        const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;
        return (
          <PollOptionRow
            key={option.optionId}
            text={toText(option?.text)}
            percentage={percentage}
            showResults={showResults}
            isMyVote={!!currentUserId && votes.includes(currentUserId)}
            isWinner={showResults && leading > 0 && votes.length === leading}
            locked={locked}
            ended={ended}
            onPress={() => handlePress(option.optionId)}
            colors={colors}
          />
        );
      })}

      <View style={styles.pollFooterRow}>
        <Text style={[styles.pollFooter, { color: colors.text }]}>
          {formatCount(totalVotes)} {totalVotes === 1 ? 'vote' : 'votes'} · {status}
        </Text>
        {!!timingLabel && (
          <View style={styles.pollTiming}>
            <MaterialIcons name={ended ? 'lock-clock' : 'schedule'} size={12} color={colors.text} />
            <Text style={[styles.pollFooter, { color: colors.text }]}>{timingLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Linked text (#tags, @mentions, links)
// ---------------------------------------------------------------------------
const formatDisplayUrl = (url: string): string => {
  const clean = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
  return clean.length > 32 ? `${clean.slice(0, 32)}…` : clean;
};

export const LinkedText = ({
  content,
  onTagPress,
  onMentionPress,
  colors,
  numberOfLines,
}: {
  content: string;
  onTagPress?: (tag: string) => void;
  onMentionPress?: (mention: string) => void;
  colors: any;
  numberOfLines?: number;
}) => {
  const text = toText(content);
  if (!text) return null;
  const parts = text.split(/((?:https?:\/\/|www\.)[^\s]+|#\w+|@\w+)/g);

  const openLink = async (url: string) => {
    const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
    try {
      if (await Linking.canOpenURL(fullUrl)) await Linking.openURL(fullUrl);
    } catch (err) {
      console.error('Failed to open link:', err);
    }
  };
  return (
    <Text style={[styles.baseText, { color: colors.text }]} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (/^(https?:\/\/|www\.)/i.test(part)) {
          return (
            <Text key={index} style={[styles.link, { color: colors.primary }]} onPress={() => openLink(part)}>
              {formatDisplayUrl(part)}
            </Text>
          );
        }
        if (part.startsWith('#')) {
          return (
            <Text key={index} style={[styles.hashtag, { color: colors.primary }]} onPress={() => onTagPress?.(part)}>
              {part}
            </Text>
          );
        }
        if (part.startsWith('@')) {
          return (
            <Text key={index} style={[styles.mention, { color: colors.primary }]} onPress={() => onMentionPress?.(part)}>
              {part}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

// ---------------------------------------------------------------------------
// Footer action button
// ---------------------------------------------------------------------------
const ActionButton = ({
  icon,
  label,
  count,
  active,
  activeColor,
  onPress,
  colors,
  accessibilityLabel,
}: {
  icon: string;
  label?: string;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
  colors: any;
  accessibilityLabel: string;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const tint = active ? activeColor || colors.primary : colors.text;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };
  const content = (
    <>
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialIcons name={icon} size={20} color={tint} />
      </Animated.View>
      {(count !== undefined || label) && (
        <Text style={[styles.actionText, { color: tint }]}>
          {count !== undefined ? formatStatNumber(count) : label}
        </Text>
      )}
    </>
  );
  if (!onPress) {
    return (
      <View style={styles.actionButton} accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={accessibilityLabel}
    >
      {content}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
const PostCardBase = ({ post: incoming, isVisible, variant = 'feed', onCommentPress }: PostCardProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { currentUser, handleDeletePost, isDeletingPost } = useAppDataContext();
  const {
    post,
    postId,
    isLiked,
    isBookmarked,
    isReposted,
    hasVoted,
    likesCount,
    bookmarksCount,
    repostsCount,
    toggleLike,
    toggleBookmark,
    toggleRepost,
    vote,
    share,
  } = usePostInteractions(incoming);

  const [isExpanded, setIsExpanded] = useState(variant === 'detail');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const author = post.postAuthorsDetails;
  const isOwner = !!currentUser?.uid && currentUser.uid === post.originalAuthor;
  const isSchoolMemo = post.audience === 'school';
  const reposter = post.featuredReposter;
  const otherReposters = Math.max(0, repostsCount - (reposter ? 1 : 0));
  const content = toText(post.content);
  const isTruncated = variant === 'feed' && content.length > TEXT_LIMIT && !isExpanded;
  const relativeTime = compactRelativeTime(post.createdAt);
  const deepLinkUrl = `https://useicampus.io/post/${postId}`;

  // Reset "see more" when a recycled cell starts showing another post.
  useEffect(() => {
    setIsExpanded(variant === 'detail');
  }, [postId, variant]);

  const openDetails = (focusComment = false) => {
    if (variant === 'detail') {
      if (focusComment) onCommentPress?.();
      return;
    }
    if (!postId) return;
    navigation.navigate('PostDetailScreen', {
      postId,
      post: toNavigablePost(post),
      focusComment,
    });
  };
  const openProfile = (identifier?: string) => {
    if (identifier) navigation.navigate('Profile', { identifier });
  };
  const handleCopyLink = () => {
    Clipboard.setString(deepLinkUrl);
    setIsMenuVisible(false);
    Toast.show({ type: 'success', text2: 'Link copied to clipboard' });
  };
  const handleJobApply = (url: string) => {
    Alert.alert('Leaving iCampus', 'You are being redirected to an external site to complete your application.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Proceed', onPress: () => Linking.openURL(url).catch(() => {}) },
    ]);
  };

  const reposterName = reposter
    ? reposter.uid === currentUser?.uid
      ? 'You'
      : displayName(reposter)
    : '';
  const event = post.eventMetadata;
  const eventDate = eventDateParts(event?.startTime || event?.date);

  return (
    <Pressable
      onPress={() => openDetails(false)}
      onLongPress={() => setIsMenuVisible(true)}
      delayLongPress={350}
      disabled={variant === 'detail'}
      android_ripple={variant === 'feed' ? { color: 'rgba(0,0,0,0.04)' } : undefined}
      accessibilityRole={variant === 'feed' ? 'button' : undefined}
      accessibilityHint={variant === 'feed' ? 'Opens the post and its comments' : undefined}
      style={[
        styles.container,
        variant === 'detail' && styles.containerDetail,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
      ]}
    >
      {/* Who reposted it */}
      {!!reposter && (
        <TouchableOpacity
          style={styles.repostBanner}
          onPress={() => openProfile(reposter.uid)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="repeat" size={14} color={colors.success} />
          <Text style={[styles.repostText, { color: colors.text }]} numberOfLines={1}>
            <Text style={{ fontWeight: '700', color: colors.textDarker }}>{reposterName}</Text>
            {otherReposters > 0
              ? ` and ${otherReposters} other${otherReposters === 1 ? '' : 's'} reposted`
              : ' reposted'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Author */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => openProfile(author?.uid)}
          disabled={!author}
          accessibilityLabel={author ? `Open ${displayName(author)}'s profile` : undefined}
        >
          {author ? (
            <UserAvatar
              profilePic={lastProfilePic(author.profilePic)}
              firstName={author.firstname}
              lastName={author.lastname}
              organizationName={author.organizationName || undefined}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary + '1A' }]}>
              <MaterialIcons name="school" size={20} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            {author ? (
              <UserIdentity
                firstname={author.firstname || ''}
                lastname={author.lastname || ''}
                tier={author.tier === 'pro' || author.tier === 'premium' ? author.tier : 'free'}
                isVerified={author.isVerified}
                isOrganization={!!author.organizationName}
                organizationName={author.organizationName || undefined}
                size="small"
                containerStyle={styles.nameShrink}
              />
            ) : (
              // Legacy posts saved without an author.
              <Text style={[styles.fallbackName, { color: colors.textDarker }]}>iCampus</Text>
            )}
            {!!relativeTime && (
              <Text
                style={[styles.timeText, { color: colors.text }]}
                accessibilityLabel={`Posted ${fullTimestamp(post.createdAt)}`}
              >
                · {relativeTime}
              </Text>
            )}
          </View>
          <View style={styles.metaRow}>
            {!!author?.username && (
              <Text style={[styles.metaText, { color: colors.text }]} numberOfLines={1}>
                @{author.username}
              </Text>
            )}
            {isSchoolMemo && (
              <View style={[styles.audienceChip, { backgroundColor: colors.primary + '18' }]}>
                <MaterialIcons name="lock" size={11} color={colors.primary} />
                <Text style={[styles.audienceText, { color: colors.primary }]}>School memo</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setIsMenuVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Post options"
          style={styles.moreButton}
        >
          <MaterialIcons name="more-horiz" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Job */}
      {post.postType === 'job' && post.jobMetadata && (
        <View style={[styles.richCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.richIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialIcons name="work-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.richTitle, { color: colors.textDarker }]} numberOfLines={2}>
              {toText(post.jobMetadata.title)}
            </Text>
            <Text style={[styles.richSub, { color: colors.text }]} numberOfLines={1}>
              {[post.jobMetadata.company, post.jobMetadata.location, post.jobMetadata.type]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {!!post.jobMetadata.salaryRange && (
              <Text style={[styles.richHighlight, { color: colors.primary }]}>{post.jobMetadata.salaryRange}</Text>
            )}
          </View>
        </View>
      )}

      {/* Event */}
      {post.postType === 'event' && event && (
        <View style={[styles.richCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.calendarTile, { borderColor: colors.primary }]}>
            <Text style={[styles.calMonth, { color: colors.primary }]}>{eventDate.month}</Text>
            <Text style={[styles.calDay, { color: colors.textDarker }]}>{eventDate.day}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.richTitle, { color: colors.textDarker }]} numberOfLines={2}>
              {toText(event.title)}
            </Text>
            <Text style={[styles.richSub, { color: colors.text }]} numberOfLines={2}>
              {eventClockTime(event.startTime)} · {event.isVirtual ? 'Online' : toText(event.location)}
            </Text>
          </View>
        </View>
      )}

      {/* Text */}
      {!!content && (
        <View style={styles.contentContainer}>
          <LinkedText
            content={isTruncated ? `${content.slice(0, TEXT_LIMIT).trimEnd()}…` : content}
            colors={colors}
            onMentionPress={mention => openProfile(mention.replace('@', ''))}
          />
          {variant === 'feed' && content.length > TEXT_LIMIT && (
            <Text
              style={[styles.seeMoreText, { color: colors.primary }]}
              onPress={() => setIsExpanded(v => !v)}
              suppressHighlighting
            >
              {isExpanded ? 'Show less' : 'See more'}
            </Text>
          )}
        </View>
      )}

      {post.postType === 'job' && !!post.jobMetadata?.applicationLink && (
        <TouchableOpacity
          style={[styles.primaryActionButton, { backgroundColor: colors.btnColor }]}
          onPress={() => handleJobApply(post.jobMetadata!.applicationLink)}
        >
          <Text style={[styles.primaryActionText, { color: colors.btnTextColor }]}>Apply now</Text>
          <MaterialIcons name="launch" size={16} color={colors.btnTextColor} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {/* Poll or media */}
      {post.poll ? (
        <PollView
          poll={post.poll}
          currentUserId={currentUser?.uid}
          hasVoted={hasVoted}
          onVote={vote}
          colors={colors}
        />
      ) : (
        <MediaSection post={post} isVisible={isVisible} />
      )}

      {/* Actions */}
      <View style={[styles.footer, { borderTopColor: colors.border + '55' }]}>
        <ActionButton
          icon={isLiked ? 'favorite' : 'favorite-border'}
          count={likesCount}
          active={isLiked}
          activeColor="#E0245E"
          onPress={toggleLike}
          colors={colors}
          accessibilityLabel={`${isLiked ? 'Unlike' : 'Like'}, ${likesCount} likes`}
        />
        <ActionButton
          icon="chat-bubble-outline"
          count={post.commentsCount ?? 0}
          onPress={() => openDetails(true)}
          colors={colors}
          accessibilityLabel={`Comment, ${post.commentsCount ?? 0} comments`}
        />
        <ActionButton
          icon="repeat"
          count={repostsCount}
          active={isReposted}
          activeColor={colors.success}
          onPress={
            isSchoolMemo
              ? () => Toast.show({ type: 'info', text2: "School memos can't be reposted" })
              : toggleRepost
          }
          colors={colors}
          accessibilityLabel={`${isReposted ? 'Undo repost' : 'Repost'}, ${repostsCount} reposts`}
        />
        <ActionButton
          icon={isBookmarked ? 'bookmark' : 'bookmark-border'}
          count={bookmarksCount}
          active={isBookmarked}
          onPress={toggleBookmark}
          colors={colors}
          accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        />
        <ActionButton
          icon="bar-chart"
          count={post.impressions || 0}
          colors={colors}
          accessibilityLabel={`${post.impressions || 0} views`}
        />
        <ActionButton icon="ios-share" onPress={share} colors={colors} accessibilityLabel="Share" />
      </View>

      {/* Options sheet */}
      <Modal
        visible={isMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsMenuVisible(false)}>
          <Pressable style={[styles.sheetContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
            <SheetItem icon="link" label="Copy link" onPress={handleCopyLink} colors={colors} />
            <SheetItem
              icon="ios-share"
              label="Share via…"
              onPress={() => {
                setIsMenuVisible(false);
                share();
              }}
              colors={colors}
            />
            {variant === 'feed' && (
              <SheetItem
                icon="open-in-new"
                label="Open post"
                onPress={() => {
                  setIsMenuVisible(false);
                  openDetails(false);
                }}
                colors={colors}
              />
            )}
            {isOwner && (
              <>
                <SheetItem
                  icon="edit"
                  label="Edit post"
                  onPress={() => {
                    setIsMenuVisible(false);
                    navigation.navigate('CreatePost', { post: toNavigablePost(post) });
                  }}
                  colors={colors}
                />
                <SheetItem
                  icon="delete-outline"
                  label="Delete post"
                  danger
                  onPress={() => {
                    setIsMenuVisible(false);
                    setDeleteModalVisible(true);
                  }}
                  colors={colors}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeletingPost) setDeleteModalVisible(false);
        }}
        onContinue={async () => {
          try {
            await handleDeletePost(postId);
            if (variant === 'detail') navigation.goBack();
          } catch {
            // handleDeletePost already shows the error.
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
};

const SheetItem = ({
  icon,
  label,
  onPress,
  colors,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
  danger?: boolean;
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} accessibilityRole="button">
    <MaterialIcons name={icon} size={22} color={danger ? colors.primary : colors.text} />
    <Text style={[styles.menuText, { color: danger ? colors.primary : colors.textDarker }]}>{label}</Text>
  </TouchableOpacity>
);

// Re-render only when the post object or presentation changes. Updates
// always produce a new post object, so reference equality is enough.
export const PostCard = React.memo(
  PostCardBase,
  (prev, next) =>
    prev.post === next.post &&
    prev.isVisible === next.isVisible &&
    prev.variant === next.variant &&
    prev.onCommentPress === next.onCommentPress,
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  containerDetail: { marginBottom: 8 },
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 2,
  },
  repostText: { fontSize: 12.5, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { marginLeft: 11, flex: 1 },
  fallbackName: { fontSize: 14, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  nameShrink: { flexShrink: 1 },
  timeText: { fontSize: 12, marginLeft: 5, opacity: 0.7, flexShrink: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
  metaText: { fontSize: 12, opacity: 0.75 },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  audienceText: { fontSize: 10.5, fontWeight: '700' },
  moreButton: { paddingLeft: 8, paddingVertical: 4 },
  contentContainer: { marginBottom: 6 },
  baseText: { fontSize: 15, lineHeight: 22 },
  seeMoreText: { fontSize: 13.5, fontWeight: '700', marginTop: 4 },
  link: { fontWeight: '600' },
  hashtag: { fontWeight: '600' },
  mention: { fontWeight: '700' },
  richCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  richIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  richTitle: { fontSize: 15, fontWeight: '700' },
  richSub: { fontSize: 12.5, marginTop: 3, opacity: 0.85 },
  richHighlight: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  calendarTile: {
    width: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calMonth: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
  calDay: { fontSize: 18, fontWeight: '800' },
  primaryActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  primaryActionText: { fontWeight: '700', fontSize: 14 },
  mediaContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 360,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  postMedia: { width: '100%', height: '100%' },
  pollContainer: {
    marginTop: 6,
    marginBottom: 4,
    padding: 12,
    paddingBottom: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pollHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  pollTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  pollStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pollStatusDot: { width: 6, height: 6, borderRadius: 3 },
  pollStatusText: { fontSize: 11, fontWeight: '700' },
  optionButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  progressBg: { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 10 },
  optionContent: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.6, marginRight: 10 },
  optionText: { fontSize: 14.5, flex: 1, fontWeight: '500' },
  optionTextStrong: { fontWeight: '700' },
  optionIcon: { marginHorizontal: 6 },
  percentageText: { fontSize: 14, fontWeight: '800', minWidth: 38, textAlign: 'right' },
  pollFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pollTiming: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pollFooter: { fontSize: 12, opacity: 0.75 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 40,
  },
  actionText: { fontSize: 12.5, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'flex-end' },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  dragIndicator: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  menuText: { fontSize: 15.5, fontWeight: '600' },
});
