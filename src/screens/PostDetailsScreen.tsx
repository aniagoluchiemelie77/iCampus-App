import React, { useState, useRef, useMemo } from 'react';
import { 
  View, FlatList, TextInput, KeyboardAvoidingView, 
  Platform, StyleSheet, Text, TouchableOpacity 
} from 'react-native';
import { PostCard } from '../components/PostCard';
import { CommentItem } from '../components/CommentSection';
import { useAppDataContext } from '../components/EventContext';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
 
export const PostDetailScreen = ({ route }: any) => {
  const { post } = route.params;
  const { addComment, toggleCommentLike } = useAppDataContext();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{id: string, name: string} | null>(null);
  const inputRef = useRef<TextInput>(null);

  const threadedComments = useMemo(() => {
    const map = new Map();
    const roots: any[] = [];
    post.comments.forEach((c: any) => map.set(c.commentId, { ...c, replies: [] }));
    map.forEach((c: any) => {
      if (c.parentId) {
        map.get(c.parentId)?.replies.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [post.comments]);

  const handleSend = async () => {
  if (!commentText.trim()) return;

  try {
    // We wait for the addComment function to finish
    await addComment(post.postId, commentText, replyingTo?.id || null);

    // Show Success Toast
    Toast.show({
      type: 'success',
      text1: 'Comment posted!',
      position: 'bottom',
      bottomOffset: 100,
    });

    // Reset UI
    setCommentText('');
    setReplyingTo(null);
    inputRef.current?.blur();
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Failed to post comment',
      text2: 'Please try again later.',
    });
  }
};

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90} 
    >
      <FlatList
        data={threadedComments}
        keyExtractor={(item) => item.commentId}
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

      {/* STICKY INPUT BAR */}
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
            <Text style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Toast config={toastConfig} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
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
    color: '#fb6a02',
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
    color: '#fb6a02',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
export default PostDetailScreen;