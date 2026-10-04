import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  FlatList,
  Linking,
  Alert,
  Pressable,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAppDataContext } from '../context/EventContext';
import { ActionModal } from './LogoutModal.tsx';
import Video from 'react-native-video';
import { Posts } from '../types/firebase';
import { formatCount } from '../utils/followCountFormatter.ts';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { UserIdentity } from './UserIdentity';
import { UserAvatar } from './UserAvatar';
import { formatPostDate } from '../utils/dateFormatter';
import { formatStatNumber } from '../utils/followCountFormatter';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { useDateTimePicker } from '../hooks/useDateTimePicker';
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
const { width } = Dimensions.get('window');
export const MediaSection = ({ post, isVisible }: PostCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaUrls = Array.isArray(post.media?.url)
    ? post.media.url
    : [post.media?.url];
  const isVideo = post.media?.mediaType === 'video';

  if (!post.media?.url) return null;

  return (
    <View style={styles.mediaContainer}>
      {isVideo && mediaUrls[0] && (
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
        <View>
          <FlatList
            data={mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const contentWidth = width - 24; // Accounts for modern container side margins (12px * 2)
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / contentWidth,
              );
              setActiveIndex(newIndex);
            }}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={styles.postMediaSlider}
                resizeMode="cover"
              />
            )}
          />
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {mediaUrls.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, activeIndex === i && styles.activeDot]}
              />
            ))}
          </View>
        </View>
      )}
      {!isVideo && mediaUrls.length === 1 && (
        <Image
          source={{ uri: mediaUrls[0] }}
          style={styles.postMedia}
          resizeMode="cover"
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
  const hasVoted = poll.options.some((opt: any) =>
    opt.votes.includes(currentUserId),
  );

  return (
    <View style={styles.pollContainer}>
      {poll.options.map((option: any) => {
        const percentage =
          poll.totalVotes > 0
            ? Math.round((option.votes.length / poll.totalVotes) * 100)
            : 0;

        const isMyVote = option.votes.includes(currentUserId);

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
                  {option.text}
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
          {formatCount(poll.totalVotes)} votes
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
  if (!content) return null;

  const regex = /((?:https?:\/\/|www\.)[^\s]+|#\w+|@\w+)/g;
  const parts = content.split(regex);

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
    const user = post.originalAuthor;
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const navigation = useNavigation<any>();
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<{
      id: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const TEXT_LIMIT = 150;
    const {
      toggleLike,
      toggleBookmark,
      currentUser,
      handleRepost,
      incrementShareCount,
      handleVote,
      handleDeletePost,
    } = useAppDataContext();
    const { formatDate, formatTime } = useDateTimePicker();
    const getRelativeTime = (dateString: string | null): string => {
      if (!dateString) return '';
      const parsedDate = formatPostDate(dateString);
      if (!parsedDate) return '';

      return formatDistanceToNowStrict(new Date(parsedDate), {
        addSuffix: false,
      })
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd');
    };
    const targetPostId = post.postId || post.id;
    const isOwner = currentUser?.uid === user;
    const isLiked = post.likes?.includes(currentUser?.uid);
    const isBookmarked = post.bookmarks?.includes(currentUser?.uid);
    const shouldShowSeeMore = post.content && post.content.length > TEXT_LIMIT;
    const displayText = isExpanded
      ? post.content
      : post.content?.slice(0, TEXT_LIMIT);
    const deepLinkUrl = `https://useicampus.io/posts/${targetPostId}`;

    const handleCopyLink = () => {
      Clipboard.setString(deepLinkUrl);
      setIsMenuVisible(false);
      Toast.show({ type: 'success', text2: 'Link copied to clipboard!' });
    };

    const handleExternalShare = async (posts: Posts) => {
      try {
        const result = await Share.share({
          message: `${
            post.content || 'Check out this post on iCampus!'
          } \n\nView more on iCampus App!`,
          url: deepLinkUrl,
        });

        if (result.action === Share.sharedAction) {
          incrementShareCount(posts.postId);
        }
      } catch (error) {
        console.error(error);
      }
    };
    const handleEditNavigate = () => {
      setIsMenuVisible(false);
      navigation.navigate('CreatePost', { post: post });
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
    const dateValue = post.eventMetadata?.date;
    const timeValue = post.eventMetadata?.startTime;
    const eventDate = dateValue ? formatDate(dateValue) : 'Not specified';
    const eventTime = timeValue ? formatTime(timeValue) : '00:00';
    const displayUser = post.featuredReposter;
    const authorDetails = post.postAuthorsDetails;
    const authorProfilePic = authorDetails?.profilePic?.length
      ? String(authorDetails.profilePic[authorDetails.profilePic.length - 1])
      : undefined;

    return (
      <Pressable
        onLongPress={() => setIsMenuVisible(true)}
        delayLongPress={400}
        style={[
          styles.container,
          {
            backgroundColor: colors.backgroundSecondary,
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
              tier={authorDetails?.tier ? authorDetails?.tier : 'free'}
              isVerified={authorDetails?.isVerified}
              isOrganization={authorDetails?.organizationName ? true : false}
              organizationName={authorDetails?.organizationName}
              size="small"
            />
            <Text style={styles.timestamp}>
              {getRelativeTime(post.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.contentContainer}>
          {post.postType === 'job' && (
            <View style={styles.jobCardBanner}>
              <Text
                style={[styles.jobTitleLarge, { color: colors.textDarker }]}
              >
                {post.jobMetadata?.title}
              </Text>
              <Text style={[styles.jobCompanySub, { color: colors.text }]}>
                {post.jobMetadata?.company} • {post.jobMetadata?.location}
              </Text>
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
                <Text style={[styles.eventTitleText, { color: colors.text }]}>
                  {post.eventMetadata?.title}
                </Text>
                <Text
                  style={[styles.eventLocationText, { color: colors.text }]}
                >
                  {post.eventMetadata?.location}
                </Text>
              </View>
            </View>
          )}
          <LinkedText
            content={displayText ?? ''}
            colors={colors}
            onTagPress={(tag: string) => {
              const cleanTag = tag.replace('#', '');
              console.log(cleanTag);
            }}
            onMentionPress={(mention: string) => {
              const name = mention.replace('@', '');
              console.log(name);
              navigation.navigate('ProfileScreen', { identifier: name });
            }}
          />
          {shouldShowSeeMore && !isExpanded && (
            <Text style={[styles.content, { color: colors.text }]}>...</Text>
          )}
          {shouldShowSeeMore && (
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
              <Text style={styles.seeMoreText}>
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
            <TouchableOpacity style={styles.rsvpButtonOutline}>
              <Text style={styles.rsvpText}>RSVP for Event</Text>
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
            onPress={() =>
              navigation.navigate('PostDetailScreen', { post: post })
            }
          >
            <MaterialIcons
              name="chat-bubble-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.commentsCount ?? 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => toggleLike(targetPostId)}
          >
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.likes?.length || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => handleRepost(targetPostId)}
          >
            <MaterialIcons
              name="repeat"
              size={18}
              color={post.isRepost ? colors.success : colors.primary}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.repostersDetails?.length || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => toggleBookmark(targetPostId)}
          >
            <MaterialIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-border'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.bookmarks?.length || 0)}
            </Text>
          </TouchableOpacity>
          <View style={styles.statGroup}>
            <MaterialIcons name="bar-chart" size={18} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.impressions || 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.shareIconContainer}
            onPress={() => handleExternalShare(post)}
          >
            <MaterialIcons name="share" size={18} color={colors.primaryTint} />
          </TouchableOpacity>
        </View>
        <Modal
          isVisible={isMenuVisible}
          onBackdropPress={() => setIsMenuVisible(false)}
          swipeDirection="down"
          onSwipeComplete={() => setIsMenuVisible(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsMenuVisible(false)}
          >
            <View
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
                onPress={() => handleExternalShare(post)}
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
                      setSelectedPost({ id: targetPostId });
                      setDeleteModalVisible(true);
                    }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={22}
                      color="#FF3B30"
                    />
                    <Text style={[styles.menuText, { color: '#FF3B30' }]}>
                      Delete post
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
        <ActionModal
          visible={deleteModalVisible}
          onClose={() => {
            if (!isDeleting) {
              setDeleteModalVisible(false);
              setSelectedPost(null);
            }
          }}
          onContinue={() => handleDeletePost(targetPostId)}
          title="Delete Post?"
          subtitle={`Are you sure you want to delete this post? This action cannot be undone.`}
          continueText="Delete"
          loading={isDeleting}
        />
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      (prevProps.post.postId || prevProps.post.id) ===
        (nextProps.post.postId || nextProps.post.id) &&
      prevProps.post.likes?.length === nextProps.post.likes?.length &&
      prevProps.post.bookmarks?.length === nextProps.post.bookmarks?.length &&
      prevProps.post.commentsCount === nextProps.post.commentsCount &&
      prevProps.post.poll === nextProps.post.poll
    );
  },
);

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 6,
    // Modern subtle shadow layer
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
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
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
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
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  shareIconContainer: {
    padding: 4,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
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
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  postMediaSlider: {
    width: width - 24, // Matches the new 12px card margins on both sides
    height: 280,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
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
