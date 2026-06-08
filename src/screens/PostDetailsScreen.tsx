import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { PostCard } from '../components/PostCard';
import { CommentItem } from '../components/CommentSection';
import { useAppDataContext } from '../components/EventContext';
import Toast from 'react-native-toast-message';
import { Posts } from 'types/firebase';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';

export const PostDetailScreen = ({ route }: any) => {
  const { post: initialPost, postId } = route.params;
  const [post, setPost] = useState<Posts | null>(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const { addComment, toggleCommentLike, fetchPostById } = useAppDataContext();

  useEffect(() => {
    let isMounted = true;
    if (!post && postId) {
      const getPostData = async () => {
        try {
          setLoading(true);
          const data = await fetchPostById(postId);
          if (isMounted) setPost(data);
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Could not load post' });
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      getPostData();
    }
    return () => {
      isMounted = false;
    };
  }, [postId, fetchPostById, post]);

  const threadedComments = useMemo(() => {
    if (!post || !post.comments) return [];
    const map = new Map();
    const roots: any[] = [];

    post.comments.forEach((c: any) =>
      map.set(c.commentId, { ...c, replies: [] }),
    );
    map.forEach((c: any) => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).replies.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [post]);

  const handleSend = async () => {
    if (!commentText.trim() || !post) return;

    try {
      await addComment(post.postId, commentText, replyingTo?.id || null);
      Toast.show({
        type: 'success',
        text1: 'Comment posted!',
        position: 'bottom',
        bottomOffset: 100,
      });
      setCommentText('');
      setReplyingTo(null);
      inputRef.current?.blur();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Failed to post comment',
      });
    }
  };
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          Post not found or has been deleted.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={threadedComments}
        keyExtractor={item => item.commentId}
        ListHeaderComponent={<PostCard post={post} isVisible={true} />}
        renderItem={({ item }) => (
          <CommentItem
            comment={item}
            onLike={(id: string) => toggleCommentLike(post.postId, id)}
            onReply={(id: string, name: string) => {
              setReplyingTo({ id, name });
              inputRef.current?.focus();
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.inputWrapper}>
        {replyingTo && (
          <View style={styles.replyBar}>
            <Text style={styles.replyText}>Replying to @{replyingTo.name}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelReply}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={!commentText.trim()}>
            <Text
              style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]}
            >
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
  },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  cancelReply: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendBtn: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  centeredText: {
    fontSize: 16,
    color: '#2222',
    marginVertical: 20,
  },
});
export default PostDetailScreen;
