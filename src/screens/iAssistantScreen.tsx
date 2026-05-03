import React, { useState, useRef} from 'react';
import {
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppSelector } from '../components/hooks';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { askIAssistantAgent } from '../api/localPostApis.ts';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper.ts';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { AssistantMessage } from '../types/firebase';

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;

export const Assistant = ({ route }: Props) => {
  const { contextType, contextData, initialMessage } = route.params;
  const user = useAppSelector(state => state.user);
  const flatListRef = useRef<FlatList>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'model',
      content:
        initialMessage ||
        `Hi! I'm your iAssistant. I'm here to help. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    const userText = input;
    setIsProcessing(true);
    setInput('');
    const userMsg: AssistantMessage = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    const result = await askIAssistantAgent({
      message: userText,
      history: messages,
      contextType: contextType,
      contextData: contextData,
      userState: user,
    });
    if (result.success) {
      setMessages(prev => [...prev, { role: 'model', content: result.reply! }]);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Assistant Offline',
        text2: 'Try again shortly.',
      });
    }
    setIsProcessing(false);
  };
  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
        loadingLabelText: 'Processing...',
      });
      if (image.path) {
        const imageUrl = await uploadToCloudinary(image.path);
        sendAttachmentMessage(imageUrl, 'image');
      }
    } catch (error: any) {
      if (
        error.message.includes('permission') ||
        error.message.includes('Required')
      ) {
        Alert.alert(
          'Permission Required',
          'iCampus needs access to your gallery to update your profile. Grant access in settings?',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else if (error.message.includes('User cancelled')) {
        console.log('User backed out');
        Toast.show({
          type: 'error',
          text2: 'Pick action cancelled by user',
        });
      } else {
        console.error('ImagePicker Error: ', error.message);
        Toast.show({
          type: 'error',
          text1: 'ImagePicker Error',
          text2: 'Error, please retry',
        });
      }
    }
  };
  const sendAttachmentMessage = async (
    url: string,
    type: 'image' | 'file',
    fileName?: string,
  ) => {
    const attachmentMsg: AssistantMessage = {
      role: 'user',
      content:
        type === 'image' ? '[Sent an image]' : `[Shared file: ${fileName}]`,
      attachments: [{ url, type, fileName: fileName || 'attachment' }],
    };
    setMessages(prev => [...prev, attachmentMsg]);
    const result = await askIAssistantAgent({
      message: `I just uploaded a ${type}.`,
      history: messages,
      contextType: contextType,
      contextData: { ...contextData, attachmentUrl: url },
      userState: user,
    });
    if (result.success) {
      setMessages(prev => [...prev, { role: 'model', content: result.reply! }]);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [types.allFiles],
      });
      const { uri, name } = result;
      const docUrl = await uploadToCloudinary(uri);
      sendAttachmentMessage(docUrl, 'file', name || 'Document');
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.error('Document Picker Error:', err);
      } else {
        console.error('Document Picker Error:', err);
        Toast.show({
          type: 'error',
          text1: 'Upload Error',
          text2: 'Failed to upload document',
        });
      }
    }
  };
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <PageHeader
        title="iAssistant"
        subtitle={
          contextType === 'lecture'
            ? route.params.contextData.topicName
            : 'General Help'
        }
      />

      <FlatList
        data={messages}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.content}
            isUser={item.role === 'user'}
            type="ai"
            attachments={item.attachments}
          />
        )}
        keyExtractor={(_, index) => index.toString()}
        ListEmptyComponent={
          <EmptyState
            iconName="speaker-notes-off-outlined"
            title="No Conversations Yet"
            subtitle="We couldn't find any of your conversations with iAssistant. Be the first to say Hi"
          />
        }
      />
      <ChatInput
        value={input}
        onChangeText={setInput}
        onSend={handleSendMessage}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder="Ask iAssistant anything..."
      />
      <Toast config={toastConfig} />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 20,
  },
});