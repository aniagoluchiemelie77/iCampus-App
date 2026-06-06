import React, { useState, useEffect } from 'react';
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
import { useAppDataContext } from './EventContext';
import Video from 'react-native-video';
import { Posts } from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import { PRIMARY_COLOR } from './Classroomcomponent';
import { UserIdentity } from './UserIdentity';
import { UserAvatar } from './UserAvatar';
import { searchUsersByUid } from '../api/localGetApis';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { User } from '../types/firebase';
const { width } = Dimensions.get('window');
import { formatEventDate } from '../utils/dateFormatter';
import { formatStatNumber } from '../utils/followCountFormatter';
import Toast from 'react-native-toast-message';
import { useTheme } from 'context/ThemeContext';
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
export const MediaSection = ({ post, isVisible }: PostCardProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaUrls = Array.isArray(post.media?.url)
    ? post.media.url
    : [post.media?.url];
  const isVideo = post.media?.mediaType === 'video';

  if (!post.media?.url) return null;

  return (
    <View style={styles.mediaContainer}>
      {/* CASE 1: VIDEO (Only renders the first URL) */}
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

      {/* CASE 2: MULTIPLE IMAGES (Slider) */}
      {!isVideo && mediaUrls.length > 1 && (
        <View>
          <FlatList
            data={mediaUrls}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / (width - 30),
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

      {/* CASE 3: SINGLE IMAGE */}
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
              isMyVote && styles.optionButtonSelected,
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
                    backgroundColor: colors.background,
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
                      ? { fontWeight: 'bold', color: colors.primary }
                      : { color: colors.text },
                  ]}
                >
                  {option.text}
                </Text>
                {isMyVote && (
                  <MaterialIcons
                    name="check-circle-outlined"
                    size={14}
                    color={colors.primary}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </View>
              {hasVoted && (
                <Text style={[styles.percentageText, { color: colors.text }]}>
                  {percentage}%
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.pollFooter}>
        <Text style={[styles.voteCount, { color: colors.text }]}>
          {poll.totalVotes} votes
        </Text>
        <Text style={[styles.pollStatus, { color: colors.text }]}>
          {hasVoted ? 'Final results' : '1 day left'}
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
    const [userDetails, setUserDetails] = useState<User | null>(null);
    const [_, setLoading] = useState(true);
    const navigation = useNavigation<any>();
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
    const getRelativeTime = (dateString: string | null): string => {
      if (!dateString) return '';
      return formatDistanceToNowStrict(new Date(dateString), {
        addSuffix: false,
      })
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd');
    };
    const isOwner = currentUser?.uid === user;
    const isLiked = post.likes?.includes(currentUser?.uid);
    const isBookmarked = post.bookmarks?.includes(currentUser?.uid);
    const shouldShowSeeMore = post.content && post.content.length > TEXT_LIMIT;
    const displayText = isExpanded
      ? post.content
      : post.content?.slice(0, TEXT_LIMIT);
    const deepLinkUrl = `https://useicampus.io/posts/${post.postId}`;

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
    const confirmDelete = () => {
      setIsMenuVisible(false);
      Alert.alert(
        'Delete Post',
        'Are you sure you want to permanently delete this post? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await handleDeletePost(post.postId);
              } catch (err) {
                console.error('Failed to delete post', err);
              }
            },
          },
        ],
      );
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
    useEffect(() => {
      const fetchPosterDetails = async () => {
        try {
          const userArray = await searchUsersByUid(
            user!,
            currentUser?.tier || 'free',
            currentUser?.usertype || 'student',
          );
          if (userArray && userArray.length > 0) {
            setUserDetails(userArray[0]);
          }
        } catch (error) {
          console.error('Error fetching poster details:', error);
        } finally {
          setLoading(false);
        }
      };

      if (user) {
        fetchPosterDetails();
      }
    }, [user, currentUser?.tier, currentUser?.usertype]);
    const eventDate = formatEventDate(post.eventMetadata?.startDate);
    const reposterIsOrganization = !post.userId?.organizationName;
    const reposterName = reposterIsOrganization
      ? post.userId?.organizationName
      : `${post.userId?.firstname} ${post.userId?.lastname}`;

    return (
      <Pressable
        onLongPress={() => setIsMenuVisible(true)}
        delayLongPress={400}
        style={[
          styles.container,
          {
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.text,
          },
        ]}
      >
        {post.isRepost && (
          <View style={styles.repostHeader}>
            <MaterialIcons name="repeat" size={14} color={colors.text} />
            <Text style={[styles.repostText, { color: colors.text }]}>
              {`${reposterName} reposted`}
            </Text>
          </View>
        )}
        <View style={styles.header}>
          <UserAvatar
            profilePic={userDetails?.profilePic}
            firstName={userDetails?.firstname}
            lastName={userDetails?.lastname}
            organizationName={userDetails?.organizationName}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <UserIdentity
              firstname={userDetails?.firstname ?? ''}
              lastname={userDetails?.lastname ?? ''}
              tier={userDetails?.tier ? userDetails?.tier : 'free'}
              isVerified={userDetails?.isVerified}
              isOrganization={userDetails?.usertype === 'enterprise'}
              organizationName={userDetails?.organizationName}
              size="medium"
            />
            <Text style={styles.timestamp}>
              {getRelativeTime(post.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.contentContainer}>
          {post.postType === 'job' && (
            <View style={{ marginBottom: 10 }}>
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
            <View style={styles.eventHeaderRow}>
              <View style={styles.calendarMini}>
                <MaterialIcons
                  name="calendar-month-outlined"
                  size={16}
                  color={colors.text}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.calMonth, { color: colors.text }]}>
                  {eventDate.month}
                </Text>
                <Text style={[styles.calDay, { color: colors.text }]}>
                  {eventDate.day}
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
                name="launch-outlined"
                size={16}
                color={colors.btnTextColor}
                style={{ marginLeft: 3 }}
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
            postId={post.postId}
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
              name="chatbubble-outline"
              size={18}
              color={colors.primaryTint}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.commentsCount ?? 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => toggleLike(post.postId)}
          >
            <MaterialIcons
              name={isLiked ? 'heart' : 'heart-outlined'}
              size={18}
              color={isLiked ? colors.primary : colors.primaryTint}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.likes?.length || 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => handleRepost(post.postId)}
          >
            <MaterialIcons
              name="repeat"
              size={18}
              color={post.isRepost ? colors.primary : colors.primaryTint}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.repostsCount ?? 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statGroup}
            onPress={() => toggleBookmark(post.postId)}
          >
            <MaterialIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-border-outlined'}
              size={18}
              color={isBookmarked ? colors.primary : colors.primaryTint}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.bookmarks?.length || 0)}
            </Text>
          </TouchableOpacity>
          <View style={styles.statGroup}>
            <MaterialIcons
              name="bar-chart"
              size={18}
              color={colors.primaryTint}
            />
            <Text style={[styles.statText, { color: colors.primary }]}>
              {formatStatNumber(post.impressions || 0)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.statGroup}
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
                style={[styles.menuItem, { borderBottomColor: colors.text }]}
                onPress={handleCopyLink}
              >
                <MaterialIcons name="link" size={22} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  Copy link
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: colors.text }]}
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
                    style={[
                      styles.menuItem,
                      { borderBottomColor: colors.text },
                    ]}
                    onPress={handleEditNavigate}
                  >
                    <MaterialIcons name="edit" size={22} color={colors.text} />
                    <Text style={[styles.menuText, { color: colors.text }]}>
                      Edit post
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem]}
                    onPress={confirmDelete}
                  >
                    <MaterialIcons
                      name="delete-outlined"
                      size={22}
                      color={colors.text}
                    />
                    <Text style={[styles.menuText, { color: colors.text }]}>
                      Delete post
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </Pressable>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.post.postId === nextProps.post.postId &&
      prevProps.post.likes?.length === nextProps.post.likes?.length &&
      prevProps.post.bookmarks?.length === nextProps.post.bookmarks?.length
    );
  },
);
const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderBottomWidth: 0.8,
    borderRadius: 15,
    marginBottom: 5,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  repostText: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  mediaContainer: {
    width: '100%',
    height: 300, // Fixed height for consistency in the feed
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  postMedia: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    marginBottom: 10,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
  },
  seeMoreText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    marginTop: 4,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statText: {
    marginLeft: 5,
    fontSize: 12,
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', // Slight dark background for visibility
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fadccc',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
  },
  postMediaSlider: {
    width: width - 20, // Subtracting horizontal margins of the post card
    height: 300,
  },
  pollContainer: {
    marginVertical: 10,
    width: '100%',
  },
  optionButton: {
    height: 45,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  optionButtonSelected: {
    borderWidth: 1.5,
  },
  progressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'center',
    zIndex: 1, // Stay above progress bar
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pollFooter: {
    flexDirection: 'row',
    marginTop: 5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voteCount: {
    fontSize: 13,
  },
  pollStatus: {
    fontSize: 13,
  },
  baseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  hashtag: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  mention: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },
  jobTitleLarge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  jobCompanySub: {
    fontSize: 14,
    marginTop: 4,
  },
  eventBody: {
    padding: 15,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  calendarMini: {
    padding: 8,
    alignItems: 'center',
    width: 50,
    flexDirection: 'row',
  },
  calMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 3,
  },
  calDay: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventLocationText: {
    fontSize: 12,
    marginTop: 2,
  },
  primaryActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 15,
  },
  primaryActionText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  rsvpButtonOutline: {
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginVertical: 15,
  },
  rsvpText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    position: 'absolute',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    bottom: 70,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.8,
    marginBottom: 15,
  },
  menuText: {
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
});
