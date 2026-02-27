import React, {useState} from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAppDataContext } from './EventContext';
import Video from 'react-native-video';
import { Posts } from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
interface PostCardProps {
  post: Posts;       // Using your existing Posts type
  isVisible: boolean; // Add this line
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
type NavigationPropProductDetails = StackNavigationProp<RootStackParamList, 'PostDetailScreen'>;

export const PostCard = ({ post, isVisible }: PostCardProps) => {
  const user = post.userId; 
  const [isExpanded, setIsExpanded] = useState(false);
  const navigation = useNavigation<NavigationPropProductDetails>();
  const TEXT_LIMIT = 150;
  const { toggleLike, toggleBookmark, currentUser, handleRepost, incrementShareCount } = useAppDataContext();
  const getRelativeTime = (dateString: string | null): string => {
    if (!dateString) return '';
    return formatDistanceToNowStrict(new Date(dateString), {
      addSuffix: false, 
    }).replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd');
  };
  const isLiked = post.likes?.includes(currentUser?.uid);
  const isBookmarked = post.bookmarks?.includes(currentUser?.uid);
  const isVideo = post.media?.mediaType === 'video';
  const isImage = post.media?.mediaType === 'image';
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
          source={{ uri: user?.profilePic?.[0] || 'https://via.placeholder.com/40' }} 
          style={styles.avatar} 
        />
        <View style={styles.headerText}>
          <Text style={styles.userName}>{user?.firstname} {user?.lastname}</Text>
          <Text style={styles.timestamp}>
          {getRelativeTime(post.createdAt)}
        </Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.content}>
          {displayText}
          {shouldShowSeeMore && !isExpanded && "..."}
        </Text>
        
        {shouldShowSeeMore && (
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
            <Text style={styles.seeMoreText}>
              {isExpanded ? "Show less" : "See more"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media Section (Images/Video) */}
      {post.media?.url && (
        <View style={styles.mediaContainer}>
          {isImage && (
            <Image 
              source={{ uri: post.media.url }} 
              style={styles.postMedia} 
              resizeMode="cover" 
            />
          )}

          {isVideo && (
            <Video
              source={{ uri: post.media.url }}
              style={styles.postMedia}
              paused={!isVisible} // Only plays when visible in the feed
              repeat={true}
              muted={true}
              resizeMode="cover"
              // Optional: show a loading indicator while buffering
              onBuffer={(b) => console.log("buffering", b)} 
              onError={(e) => console.log("video error", e)}
            />
          )}
        </View>
      )}

      {/* Footer: Interactions */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.statGroup} onPress={() => navigation.navigate('PostDetailScreen', { post: post })}>
          <MaterialIcons name="chatbubble-outline" size={18} color="#666" />
          <Text style={styles.statText}>
            {formatStatCount(post.commentsCount ?? 0)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statGroup} 
          onPress={() => toggleLike(post.postId)}
        >
          <MaterialIcons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#f54b02" : "#666"} />
          <Text style={styles.statText}>{formatStatCount(post.likes?.length || 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statGroup} onPress={() => handleRepost(post.postId)}>
          <MaterialIcons name="repeat" size={18} color={post.isRepost ? "#f54b02" : "#666"} />
          <Text style={styles.statText}>{formatStatCount(post.repostsCount ?? 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.statGroup} 
          onPress={() => toggleBookmark(post.postId)}
        >
          <MaterialIcons name={isBookmarked ? "bookmark" : "bookmark-border"} size={18} color={isBookmarked ? "#f54b02" : "#666"} />
          <Text style={styles.statText}>{formatStatCount(post.bookmarks?.length || 0)}</Text>
        </TouchableOpacity>
        
        <View style={styles.statGroup}>
          <MaterialIcons name="bar-chart" size={18} color="#666" />
          <Text style={styles.statText}>{formatStatCount(post.impressions || 0)}</Text>
        </View>
        <TouchableOpacity style={styles.statGroup} onPress={() => handleExternalShare(post)}>
          <MaterialIcons name="share" size={18} color="#666" />
          <Text style={styles.statText}>{formatStatCount(post.shares?.length || 0)}</Text>
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
});