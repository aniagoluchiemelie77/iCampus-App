import { PRIMARY_COLOR } from '../assets/styles/colors';
import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { formatTime } from '../utils/ChatTimestampFormatter';
import { Attachment } from '../types/firebase';
import { downloadFile } from '../utils/downloadHelper';
import { useTheme } from '../context/ThemeContext';

interface MessageBubbleProps {
  content: string;
  isUser: boolean;
  type?: 'ai' | 'p2p';
  timestamp?: string;
  status: 'sent' | 'delivered' | 'seen' | 'deleted';
  attachments?: Attachment[];
  isEdited?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}
export const MessageBubble = ({
  content,
  isUser,
  type = 'p2p',
  timestamp,
  status,
  attachments,
  isEdited,
  onEdit,
  onDelete,
}: MessageBubbleProps) => {
  const { colors } = useTheme();
  const isDeleted = status === 'deleted';
  return (
    <TouchableOpacity
      style={[
        isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
        { maxWidth: '85%', marginVertical: 5 },
      ]}
      onLongPress={() => {
        if (isUser && type === 'p2p' && !isDeleted) {
          Alert.alert('Message Options', 'Choose an action', [
            { text: 'Edit', onPress: () => onEdit?.() },
            {
              text: 'Delete',
              onPress: () => onDelete?.(),
              style: 'destructive',
            },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
      }}
      disabled={!isUser || type !== 'p2p'}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? {
                backgroundColor: colors.primary,
                borderBottomRightRadius: 2,
              }
            : {
                backgroundColor: colors.backgroundSecondary,
                borderBottomLeftRadius: 2,
              },
        ]}
      >
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
                  style={[styles.fileRow]}
                  onPress={() =>
                    downloadFile(file.url, file.fileName || 'file')
                  }
                >
                  <MaterialIcons
                    name="file-download-outlined"
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

        <Text style={[styles.text, { color: '#fff' }]}>
          {isDeleted ? 'This message was deleted' : content}
        </Text>
        {(timestamp || status) && !isDeleted && (
          <View style={styles.footer}>
            {timestamp && (
              <Text
                style={[
                  styles.timeText,
                  { color: isUser ? 'rgba(255, 255, 255, 0.7)' : '#fff' },
                ]}
              >
                {formatTime(timestamp)}
              </Text>
            )}
            {isUser && status && (
              <MaterialIcons
                name={status === 'seen' ? 'done-all' : 'done'}
                size={14}
                style={[styles.statusIcon]}
                color={'#fff'}
              />
            )}
            {isEdited && (
              <Text
                style={[
                  styles.timeText,
                  { color: isUser ? 'rgba(255, 255, 255, 0.7)' : '#fff' },
                ]}
              >
                Edited
              </Text>
            )}
          </View>
        )}

        {/* The Tail */}
        <View
          style={[
            styles.tail,
            isUser ? styles.userTail : styles.otherTail,
            { backgroundColor: colors.primary },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    borderRadius: 15,
    position: 'relative',
  },
  text: { fontSize: 14 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: { fontSize: 10 },
  statusIcon: { marginLeft: 3 },

  // Tail Styling
  tail: {
    position: 'absolute',
    width: 10,
    height: 10,
    bottom: 0,
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
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
  fileName: {
    fontSize: 13,
    marginLeft: 8,
    flexShrink: 1, // Prevents long names from breaking the layout
  },
});
