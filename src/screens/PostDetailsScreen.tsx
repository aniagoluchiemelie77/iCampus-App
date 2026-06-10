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
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const PostDetailScreen = ({ route }: any) => {
  const { colors } = useTheme();
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <PageHeader title="Post Detail" />
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

      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {replyingTo && (
          <View style={styles.replyBar}>
            <Text style={[styles.replyText, { color: colors.text }]}>
              Replying to @{replyingTo.name}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <MaterialIcons name="cancel-outlined" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            placeholderTextColor={colors.inputTextHolder}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!commentText.trim()}
            style={[styles.sendBtn, { backgroundColor: colors.btnColor }]}
          >
            <MaterialIcons name="send" size={22} color={colors.btnTextColor} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
    position: 'relative',
  },
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: PRIMARY_COLOR_TINT,
    paddingVertical: 15,
    paddingHorizontal: 8,
  },
  replyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  replyText: {
    fontSize: 12,
    flex: 1
  },
  cancelReply: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 10,
    maxHeight: 120,
    fontSize: 14,
  },
  sendBtn: {
    fontWeight: 'bold',
    padding: 10,
    borderRadius: 10,
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
