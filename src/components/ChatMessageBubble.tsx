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
        isUser
          ? { alignSelf: 'flex-end', marginRight: 10 }
          : { alignSelf: 'flex-start', marginLeft: 10 },
        { maxWidth: '82%', marginVertical: 7 },
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
      activeOpacity={0.9}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? {
                backgroundColor: colors.btnColor,
                borderBottomRightRadius: 4,
              }
            : {
                backgroundColor: colors.backgroundSecondary,
                borderBottomLeftRadius: 4,
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
                    {
                      backgroundColor: isUser
                        ? 'rgba(0,0,0,0.1)'
                        : colors.background,
                    },
                  ]}
                  onPress={() =>
                    downloadFile(file.url, file.fileName || 'file')
                  }
                >
                  <MaterialIcons
                    name="insert-drive-file"
                    size={20}
                    color={isUser ? '#fff' : PRIMARY_COLOR}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.fileName,
                      { color: isUser ? '#fff' : colors.text },
                    ]}
                  >
                    {file.fileName}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        )}

        <Text
          style={[
            styles.text,
            { color: isUser ? colors.btnTextColor : colors.text },
            isDeleted && styles.deletedText,
          ]}
        >
          {isDeleted ? 'This message was deleted' : content}
        </Text>

        {(timestamp || status) && !isDeleted && (
          <View style={styles.footer}>
            {isEdited && (
              <Text
                style={[
                  styles.timeText,
                  {
                    color: isUser
                      ? 'rgba(255, 255, 255, 0.7)'
                      : colors.textMuted,
                    marginRight: 4,
                  },
                ]}
              >
                edited
              </Text>
            )}
            {timestamp && (
              <Text
                style={[
                  styles.timeText,
                  {
                    color: isUser
                      ? 'rgba(255, 255, 255, 0.7)'
                      : colors.textMuted,
                  },
                ]}
              >
                {formatTime(timestamp)}
              </Text>
            )}
            {isUser && status && (
              <MaterialIcons
                name={status === 'seen' ? 'done-all' : 'done'}
                size={14}
                style={styles.statusIcon}
                color={
                  status === 'seen' ? '#4cd964' : 'rgba(255, 255, 255, 0.7)'
                }
              />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  bubble: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  deletedText: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
  },
  statusIcon: {
    marginLeft: 4,
  },
  attachmentContainer: {
    marginBottom: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachedImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  fileName: {
    fontSize: 13,
    marginLeft: 8,
    flexShrink: 1,
    fontWeight: '500',
  },
});
