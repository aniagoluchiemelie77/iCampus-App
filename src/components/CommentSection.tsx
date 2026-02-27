import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';


export const CommentItem = ({ comment, onLike, onReply }: any) => {
  return (
    <View style={styles.commentContainer}>
      <View style={styles.row}>
        <Image source={{ uri: comment.userId.profilePic }} style={styles.miniAvatar} />
        <View style={styles.textBubble}>
          <Text style={styles.author}>{comment.userId.firstname}</Text>
          <Text>{comment.comment}</Text>
        </View>
      </View>

      {/* Comment Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onLike(comment.commentId)}>
          <Text style={styles.actionText}>Like ({comment.likes?.length || 0})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply(comment.commentId)}>
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      </View>

      {/* THE MAGIC: Recursive Rendering */}
      {comment.replies?.length > 0 && (
        <View style={styles.replyThread}>
          {comment.replies.map((reply: any) => (
            <CommentItem 
              key={reply.commentId} 
              comment={reply} 
              onLike={onLike} 
              onReply={onReply} 
            />
          ))}
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  commentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: '#ddd',
  },
  textBubble: {
    flex: 1,
    backgroundColor: '#F2F3F5', // Light gray bubble
    padding: 10,
    borderRadius: 15,
  },
  author: {
    fontWeight: 'bold',
    marginBottom: 2,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 52, // Align with the start of the text bubble
    marginTop: 5,
  },
  actionText: {
    marginRight: 20,
    fontSize: 12,
    color: '#65676B',
    fontWeight: '600',
  },
  replyThread: {
    marginLeft: 20, // Indent replies
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 1.5,
    borderLeftColor: '#E1E1E1', // The visual thread line
  },
});