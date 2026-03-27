import React, {useState} from 'react';
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
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAppDataContext } from './EventContext';
import Video from 'react-native-video';
import { Posts } from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { PRIMARY_COLOR } from './Classroomcomponent';
const { width } = Dimensions.get('window');
interface PostCardProps {
  post: Posts; // Using your existing Posts type
  isVisible: boolean; // Add this line
}
interface LinkedTextProps {
  content: string;
  onTagPress?: (tag: string) => void;
  onMentionPress?: (mention: string) => void;
}
export const formatStatCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};
type NavigationPropProductDetails = StackNavigationProp<
  RootStackParamList,
  'PostDetailScreen'
>;
const MediaSection = ({ post, isVisible }: PostCardProps) => {
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
}: {
  poll: any;
  currentUserId: string;
  postId: string;
  onVote: (postId: string, optionId: string) => void;
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
              hasVoted && styles.optionButtonDisabled,
              isMyVote && styles.optionButtonSelected,
            ]}
            disabled={hasVoted}
            onPress={() => onVote(postId, option.optionId)}
          >
            {/* Progress Bar background fills behind the text */}
            {hasVoted && (
              <View style={[styles.progressBg, { width: `${percentage}%` }]} />
            )}

            <View style={styles.optionContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.optionText, isMyVote && styles.boldText]}>
                  {option.text}
                </Text>
                {isMyVote && (
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color="#f54b02"
                    style={{ marginLeft: 5 }}
                  />
                )}
              </View>
              {hasVoted && (
                <Text style={styles.percentageText}>{percentage}%</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.pollFooter}>
        <Text style={styles.voteCount}>{poll.totalVotes} votes</Text>
        <Text style={styles.dotSeparator}>•</Text>
        <Text style={styles.pollStatus}>
          {hasVoted ? 'Final results' : '1 day left'}
        </Text>
      </View>
    </View>
  );
};
const LinkedText = ({
  content,
  onTagPress,
  onMentionPress,
}: LinkedTextProps) => {
  if (!content) return null;

  const regex = /((?:https?:\/\/|www\.)[^\s]+|#\w+|@\w+)/g;
  const parts = content.split(regex);

  const handleLinkPress = async (url: string) => {
    const fullUrl = url.startsWith('www') ? `https://${url}` : url;
    const supported = await Linking.canOpenURL(fullUrl);
    if (supported) await Linking.openURL(fullUrl);
  };

  return (
    <Text style={styles.baseText}>
      {parts.map((part, index) => {
        // Handle Links
        if (part.match(/^https?:\/\/|www\./)) {
          return (
            <Text
              key={index}
              style={styles.link}
              onPress={() => handleLinkPress(part)}
            >
              {part}
            </Text>
          );
        }
        // Handle Hashtags
        if (part.startsWith('#')) {
          return (
            <Text
              key={index}
              style={styles.hashtag}
              onPress={() => onTagPress?.(part)}
            >
              {part}
            </Text>
          );
        }
        // Handle Mentions
        if (part.startsWith('@')) {
          return (
            <Text
              key={index}
              style={styles.mention}
              onPress={() => onMentionPress?.(part)}
            >
              {part}
            </Text>
          );
        }
        // Normal Text
        return part;
      })}
    </Text>
  );
};
export const PostCard = ({ post, isVisible }: PostCardProps) => {
  const user = post.userId;
  const [isExpanded, setIsExpanded] = useState(false);
  const navigation = useNavigation<NavigationPropProductDetails>();
  const TEXT_LIMIT = 150;
  const {
    toggleLike,
    toggleBookmark,
    currentUser,
    handleRepost,
    incrementShareCount,
    handleVote, // Ensure this exists in your Context
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

  const isLiked = post.likes?.includes(currentUser?.uid);
  const isBookmarked = post.bookmarks?.includes(currentUser?.uid);
  const shouldShowSeeMore = post.content && post.content.length > TEXT_LIMIT;
  const displayText = isExpanded
    ? post.content
    : post.content?.slice(0, TEXT_LIMIT);

  const handleExternalShare = async (posts: Posts) => {
    try {
      const result = await Share.share({
        message: `${posts.content} \n\n View more on iCampus App!`,
        url: `https://iCampus.com/posts/${posts.postId}`, // Deep link
      });

      if (result.action === Share.sharedAction) {
        incrementShareCount(posts.postId);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{
            uri: user?.profilePic?.[0] || 'https://via.placeholder.com/40',
          }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.userName}>
            {user?.firstname} {user?.lastname}
          </Text>
          <Text style={styles.timestamp}>
            {getRelativeTime(post.createdAt)}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.contentContainer}>
        <LinkedText
          content={displayText ?? ''}
          onTagPress={(tag: string) => {
            const cleanTag = tag.replace('#', '');
            console.log(cleanTag);
            //navigation.navigate('SearchScreen', { query: cleanTag });
          }}
          onMentionPress={(mention: string) => {
            const username = mention.replace('@', '');
            console.log(username);
            //navigation.navigate('ProfileScreen', { username: username });
          }}
        />
        {shouldShowSeeMore && !isExpanded && (
          <Text style={styles.content}>...</Text>
        )}
        {shouldShowSeeMore && (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
            <Text style={styles.seeMoreText}>
              {isExpanded ? 'Show less' : 'See more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Conditional: Show Poll OR Media */}
      {post.poll ? (
        <PollView
          poll={post.poll}
          currentUserId={currentUser?.uid}
          postId={post.postId}
          onVote={handleVote}
        />
      ) : (
        <MediaSection post={post} isVisible={isVisible} />
      )}

      {/* Footer: Interactions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.statGroup}
          onPress={() =>
            navigation.navigate('PostDetailScreen', { post: post })
          }
        >
          <MaterialIcons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.statText}>
            {formatStatCount(post.commentsCount ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statGroup}
          onPress={() => toggleLike(post.postId)}
        >
          <MaterialIcons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={isLiked ? '#f54b02' : '#666'}
          />
          <Text style={styles.statText}>
            {formatStatCount(post.likes?.length || 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statGroup}
          onPress={() => handleRepost(post.postId)}
        >
          <MaterialIcons
            name="repeat"
            size={18}
            color={post.isRepost ? '#f54b02' : '#666'}
          />
          <Text style={styles.statText}>
            {formatStatCount(post.repostsCount ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statGroup}
          onPress={() => toggleBookmark(post.postId)}
        >
          <MaterialIcons
            name={isBookmarked ? 'bookmark' : 'bookmark-border'}
            size={18}
            color={isBookmarked ? '#f54b02' : '#666'}
          />
          <Text style={styles.statText}>
            {formatStatCount(post.bookmarks?.length || 0)}
          </Text>
        </TouchableOpacity>

        <View style={styles.statGroup}>
          <MaterialIcons name="bar-chart" size={18} color="#666" />
          <Text style={styles.statText}>
            {formatStatCount(post.impressions || 0)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.statGroup}
          onPress={() => handleExternalShare(post)}
        >
          <MaterialIcons name="share" size={18} color="#666" />
          <Text style={styles.statText}>
            {formatStatCount(post.shares?.length || 0)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
  },
  seeMoreText: {
    color: '#f54b02', // Or your app's primary color
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
    color: '#666',
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
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    borderColor: '#f54b02',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  optionButtonDisabled: {
    borderColor: '#E1E8ED',
  },
  optionButtonSelected: {
    borderColor: '#f54b02',
    borderWidth: 1.5,
  },
  progressBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 75, 2, 0.1)', // Light brand color fill
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
    color: '#333',
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pollFooter: {
    flexDirection: 'row',
    marginTop: 4,
  },
  voteCount: {
    fontSize: 13,
    color: '#666',
  },
  dotSeparator: {
    marginHorizontal: 5,
    color: '#666',
  },
  pollStatus: {
    fontSize: 13,
    color: '#666',
  },
  boldText: {
    fontWeight: 'bold',
  },
  baseText: {
    fontSize: 14,
    color: '#2222',
    lineHeight: 20,
  },
  link: {
    color: PRIMARY_COLOR, // LinkedIn Blue
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
});