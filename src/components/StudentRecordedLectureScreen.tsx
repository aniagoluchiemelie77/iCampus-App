import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  FlatList,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Video, { ResizeMode } from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from './hooks';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from './HomeScreenComponents';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { Lecture, Comment } from 'types/firebase';

interface StudentRecordedLecturesProps {
  lectureTitle: string;
  lectureVideoUrl: string;
  admin: boolean;
  lectureId: string;
  extraDetails: Lecture | null;
}

export const StudentRecordedLecturesScreen: React.FC<
  StudentRecordedLecturesProps
> = ({ lectureTitle, lectureVideoUrl, admin, extraDetails, lectureId }) => {
  const user = useAppSelector(state => state.user);
  const videoRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const [watchedSegments, setWatchedSegments] = useState<Set<number>>(
    new Set(),
  );
  const [hasAttended, setHasAttended] = useState(false);
  const [duration, setDuration] = useState(0); // Need this for segment math

  const [views, setViews] = useState(extraDetails?.views || 0);
  const [likes, setLikes] = useState(extraDetails?.likes || 0);
  const [commentCount, setCommentCount] = useState(
    extraDetails?.comments?.length || 0,
  );
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(
    extraDetails?.comments || [],
  );
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  useEffect(() => {
    if (!user?.uid || !lectureId) return;
    const socket = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: user.uid },
    });
    socketRef.current = socket;

    socket.emit('join_lecture', lectureId); //
    socket.emit('increment_view', lectureId); //

    socket.on('stats_updated', data => {
      if (data.lectureId === lectureId) {
        setViews(data.views);
        setLikes(data.likes);
        setCommentCount(data.commentCount);
      }
      if (data.comments) {
        setComments(data.comments);
      }
    });

    return () => {
      socket.emit('leave_lecture', lectureId);
      socket.disconnect();
    };
  }, [lectureId, user.uid]);

  const onLoad = (data: any) => {
    setDuration(data.duration);
  };
  const postComment = () => {
    if (newComment.trim().length === 0) return;

    const temporaryId = Date.now().toString();
    const optimisticComment: Comment = {
      id: temporaryId,
      userId: user.uid ?? '', // Fallback to empty string
      firstName: user.firstname ?? 'User', // Fallback to default name
      userName: user.username ?? 'anonymous', // Fallback to default username
      profilePic: user.profilePic?.[0] ?? '', // Fallback to empty string
      text: newComment,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: [],
    };

    // 1. Update UI immediately
    setComments(prev => [optimisticComment, ...prev]);
    setNewComment('');

    // 2. Tell the server
    socketRef.current?.emit('post_comment', {
      lectureId,
      text: newComment,
      userId: user.uid,
      firstName: user.firstname,
      userName: user.username,
      profilePic: user.profilePic?.[0],
    });
  };

  const onProgress = (data: any) => {
    if (admin || duration === 0) return;
    const currentTime = data.currentTime;
    const segmentDuration = duration / 5;
    const currentSegment = Math.floor(currentTime / segmentDuration);

    if (currentSegment >= 0 && currentSegment < 5) {
      if (!watchedSegments.has(currentSegment)) {
        const updatedSegments = new Set(watchedSegments).add(currentSegment);
        setWatchedSegments(updatedSegments);
        if (updatedSegments.size >= 4 && !hasAttended) {
          setHasAttended(true);
          markAttendanceOnBackend();
        }
      }
    }
  };
  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out this lecture on ${lectureTitle}\n${lectureVideoUrl}`,
      });
    } catch (error: any) {
      console.log(error.message);
    }
  };

  const markAttendanceOnBackend = () => {
    socketRef.current?.emit('mark_attendance', { lectureId, userId: user.uid });
  };
  const handleLikeComment = (commentId: string) => {
    setComments(prevComments =>
      prevComments.map(comment => {
        if (comment.id === commentId) {
          return { ...comment, likes: (comment.likes || 0) + 1 };
        }
        // If it's a nested reply, we need to check there too
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId
                ? { ...reply, likes: (reply.likes || 0) + 1 }
                : reply,
            ),
          };
        }
        return comment;
      }),
    );
    socketRef.current?.emit('like_comment', {
      lectureId,
      commentId,
      userId: user.uid,
    });
  };
  const handleReplyComment = (parentCommentId: string, replyText: string) => {
    if (!user?.uid || !replyText.trim()) return;

    const temporaryId = `reply_${Date.now()}`;
    const optimisticReply: Comment = {
      id: temporaryId,
      userId: user.uid,
      firstName: user.firstname ?? 'Student',
      userName: user.username ?? 'user',
      profilePic: user.profilePic?.[0] ?? '',
      text: replyText,
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: [],
    };
    setComments(prevComments =>
      prevComments.map(comment => {
        if (comment.id === parentCommentId) {
          // Found the parent! Add the reply to its list
          return {
            ...comment,
            replies: [...(comment.replies || []), optimisticReply],
          };
        }
        return comment;
      }),
    );

    // setReplyText("");
    socketRef.current?.emit('reply_comment', {
      lectureId,
      parentCommentId,
      text: replyText,
      userId: user.uid,
      firstName: user.firstname ?? 'Student',
      userName: user.username ?? 'user',
      profilePic: user.profilePic?.[0] ?? '',
    });
  };
  const getTimeAgo = (timestamp: string | number | Date) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentContainer}>
      <Image source={{ uri: item.profilePic }} style={styles.commentAvatar} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUser}>
            {item.firstName}@{item.userName}
          </Text>
          <Text style={styles.commentTime}>{getTimeAgo(item.timestamp)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>

        {/* Interaction with Comment */}
        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLikeComment(item.id)}
          >
            <Icon name="thumb-up-outline" size={14} color="#666" />
            <Text style={styles.actionText}>{item.likes || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setActiveReplyId(activeReplyId === item.id ? null : item.id);
              setReplyInput('');
            }}
          >
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        </View>
        {activeReplyId === item.id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              value={replyInput}
              onChangeText={setReplyInput}
              placeholder="Write a reply..."
              autoFocus
            />
            <TouchableOpacity
              onPress={() => {
                handleReplyComment(item.id, replyInput);
                setActiveReplyId(null);
                setReplyInput('');
              }}
            >
              <Icon name="send" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>
        )}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesSection}>
            {item.replies.map(reply => (
              <View key={reply.id} style={styles.replyRow}>
                <Image
                  source={{ uri: reply.profilePic }}
                  style={styles.replyAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUser}>
                    {reply.firstName}@{reply.userName}
                  </Text>
                  <Text style={styles.commentText}>{reply.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        ListHeaderComponent={
          <>
            <Video
              ref={videoRef}
              source={{ uri: lectureVideoUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              controls={true}
              paused={false}
              onLoad={onLoad}
              onProgress={onProgress}
            />
            <View style={styles.interactionBar}>
              <View style={styles.statItem}>
                <Icon name="eye-outline" size={20} color="#666" />
                <Text style={styles.statText}>{views}</Text>
              </View>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() =>
                  socketRef.current?.emit('like_pressed', lectureId)
                }
              >
                <Icon name="thumb-up-outline" size={20} color="#666" />
                <Text style={styles.statText}>{likes}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.statItem}>
                <Icon name="comment-outline" size={20} color="#666" />
                <Text style={styles.statText}>{commentCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statItem} onPress={onShare}>
                <Icon name="share-variant-outline" size={20} color="#666" />
                <Text style={styles.statText}>Share</Text>
              </TouchableOpacity>
              {!admin && (
                <View style={styles.attendanceBadge}>
                  <Text style={styles.attendanceBadgeText}>
                    {hasAttended ? ' ✓' : ` ${watchedSegments.size}/4 `}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.titleSectionTitle}>{lectureTitle}</Text>
              <Text style={styles.titleSectionText}>
                {formatTime(duration)}
              </Text>
            </View>
          </>
        }
        stickyHeaderIndices={[0]} // Optional: keep video at top
      />
      <View style={styles.inputWrapper}>
        <Image
          source={{ uri: user.profilePic?.[0] }}
          style={styles.smallAvatar}
        />
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={postComment}>
          <Icon name="send" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  video: { width: '100%', height: 250, backgroundColor: '#2222' },
  interactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  titleSectionTitle: {
    fontSize: 18,
    color: '#2222',
  },
  titleSectionText: {
    fontSize: 13,
    color: '#666',
  },
  statItem: { alignItems: 'center', flexDirection: 'row', marginRight: 8 },
  statText: { marginLeft: 3, color: '#666', fontSize: 13 },
  attendanceBadge: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  attendanceBadgeText: {
    color: '#fff',
    fontSize: 13,
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  commentTime: {
    fontSize: 11,
    color: '#666',
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#2222',
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    fontWeight: '500',
  },
  // Floating/Bottom Input Bar
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#FFF',
  },
  smallAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F2F2F2',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 14,
    color: '#000',
  },
  repliesSection: {
    marginTop: 10,
    borderLeftWidth: 1,
    borderLeftColor: PRIMARY_COLOR_TINT,
    paddingLeft: 10,
  },
  replyRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'flex-start',
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  replyInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 5,
    color: '#2222',
  },
});
