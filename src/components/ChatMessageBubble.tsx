import { PRIMARY_COLOR, PRIMARY_COLOR_TINT_MAIN } from 'assets/styles/colors';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  type?: 'ai' | 'p2p'; 
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'seen';
}
export const MessageBubble = ({ content, isUser, type = 'p2p', timestamp, status }: MessageBubbleProps) => {
  return (
    <View style={[
      styles.bubble, 
      isUser ? styles.userBubble : (type === 'ai' ? styles.aiBubble : styles.p2pBubble)
    ]}>
      <Text style={isUser ? styles.userText : styles.otherText}>{content}</Text>
      
      {/* Optional: Add Time and Status for P2P */}
      {(timestamp || status) && (
        <View style={styles.footer}>
          {timestamp && <Text style={[styles.timeText, isUser ? styles.userTimeText : styles.otherTimeText]}>{timestamp}</Text>}
          {isUser && status && <Text style={[styles.statusText, isUser ? styles.userTimeText : styles.otherTimeText]}>{status}</Text>}
        </View>
      )}
      
      <View style={[styles.tail, isUser ? styles.userTail : styles.otherTail]} />
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 5,
    maxWidth: '85%',
    position: 'relative',
    backgroundColor: '#fadccc'
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR, 
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#fadccc',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  p2pBubble: {
    backgroundColor: '#fadccc',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  userText: { color: '#fff', fontSize: 15 },
  otherText: { color: PRIMARY_COLOR, fontSize: 15 }, 
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
  timeText: { fontSize: 10},
  statusText: {fontSize: 10, marginLeft: 4},
  userTimeText:{
    color: PRIMARY_COLOR_TINT_MAIN
  },
  otherTimeText:{
    color: PRIMARY_COLOR
  },
  tail: {
    position: 'absolute',
    width: 10,
    height: 10,
    bottom: 0,
    transform: [{ rotate: '45deg' }],
  },
  userTail: { right: -4, bottom: 5 },
  otherTail: { left: -4, bottom: 5}, // Adjust to match bubble color
});