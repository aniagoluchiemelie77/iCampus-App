import { PRIMARY_COLOR } from 'assets/styles/colors';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { formatTime } from '../utils/ChatTimestampFormatter';
import { Attachment } from '../types/firebase';
import { downloadFile } from '../utils/downloadHelper';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  type?: 'ai' | 'p2p';
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'seen';
  attachments?: Attachment[];
}
export const MessageBubble = ({
  content,
  isUser,
  type = 'p2p',
  timestamp,
  status,
  attachments,
}: MessageBubbleProps) => {
  return (
    <View
      style={[
        isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
        { maxWidth: '85%', marginVertical: 5 },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? styles.userBubble
            : type === 'ai'
            ? styles.aiBubble
            : styles.p2pBubble,
        ]}
      >
        {/* Render Attachments first so text follows beneath them */}
        {attachments && attachments.length > 0 && (
          <View style={styles.attachmentContainer}>
            {attachments.map((file, index) =>
              file.type === 'image' ? (
                <TouchableOpacity
                  key={index}
                  onLongPress={() =>
                    downloadFile(file.url, file.fileName || `img_${index}.jpg`)
                  }
                  activeOpacity={0.8}
                >
                  <Image
                    key={index}
                    source={{ uri: file.url }}
                    style={styles.attachedImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.fileRow,
                    isUser ? styles.fileRowUser : styles.fileRowUserNotUser,
                  ]}
                  onPress={() => downloadFile(file.url, file.fileName)}
                >
                  <MaterialIcons
                    name="file-download"
                    size={20}
                    color={isUser ? '#fff' : PRIMARY_COLOR}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.fileName,
                      { color: isUser ? '#fff' : PRIMARY_COLOR },
                    ]}
                  >
                    {file.fileName}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        <Text style={isUser ? styles.userText : styles.otherText}>
          {content}
        </Text>

        {(timestamp || status) && (
          <View style={styles.footer}>
            {timestamp && (
              <Text
                style={[
                  styles.timeText,
                  isUser ? styles.userTimeText : styles.otherTimeText,
                ]}
              >
                {formatTime(timestamp)}
              </Text>
            )}
            {isUser && status && (
              <MaterialIcons
                name={status === 'seen' ? 'done-all' : 'done'}
                size={14}
                style={[
                  styles.statusIcon,
                  isUser ? styles.userTimeText : styles.otherTimeText,
                ]}
              />
            )}
          </View>
        )}

        {/* The Tail */}
        <View
          style={[
            styles.tail,
            isUser ? styles.userTail : styles.otherTail,
            { backgroundColor: isUser ? PRIMARY_COLOR : '#fadccc' },
          ]}
        />
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    borderRadius: 15,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR,
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#fadccc',
    borderBottomLeftRadius: 2,
  },
  p2pBubble: {
    backgroundColor: '#fadccc',
    borderBottomLeftRadius: 2,
  },
  userText: { color: '#fff', fontSize: 15 },
  otherText: { color: '#333', fontSize: 15 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: { fontSize: 10 },
  statusIcon: { marginLeft: 3 },
  userTimeText: { color: 'rgba(255, 255, 255, 0.7)' },
  otherTimeText: { color: '#888' },

  // Tail Styling
  tail: {
    position: 'absolute',
    width: 10,
    height: 10,
    bottom: 0,
    transform: [{ rotate: '45deg' }],
    zIndex: -1, // Keep it behind the bubble content
  },
  userTail: {
    right: -4,
    bottom: 5,
  },
  otherTail: {
    left: -4,
    bottom: 5,
  },
  attachmentContainer: {
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileRowUser: {
    backgroundColor: PRIMARY_COLOR,
  },
  fileRowUserNotUser: {
    backgroundColor: '#fadccc',
  },
  fileName: {
    fontSize: 13,
    marginLeft: 8,
    flexShrink: 1, // Prevents long names from breaking the layout
  },
});
