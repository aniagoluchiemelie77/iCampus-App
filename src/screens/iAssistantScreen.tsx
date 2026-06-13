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
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper.ts';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import { AssistantMessage } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;

export const Assistant = ({ route }: Props) => {
  const { colors } = useTheme();
  const { contextType, contextData, initialMessage } = route.params;
  const user = useAppSelector(state => state.user);
  const flatListRef = useRef<FlatList>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'model',
      content:
        initialMessage ||
        `Hello! I am your Academic AI Tutor. Ask me any questions about your courses, lectures, or study materials!`,
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
      history: messages, // Sends current state history before appending new ones
      contextType: contextType,
      contextData: contextData,
      userState: user,
    });

    if (result.success && result.reply) {
      setMessages(prev => [...prev, { role: 'model', content: result.reply! }]);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Tutor Offline',
        text2: 'Could not reach academic server. Try again shortly.',
      });
    }
    setIsProcessing(false);
  };

  const sendAttachmentMessage = async (
    url: string,
    type: 'image' | 'file',
    fileName?: string,
  ) => {
    const attachmentMsg: AssistantMessage = {
      role: 'user',
      content:
        type === 'image'
          ? '[Sent an image for review]'
          : `[Shared file: ${fileName}]`,
      attachments: [{ url, type, fileName: fileName || 'attachment' }],
    };

    setMessages(prev => [...prev, attachmentMsg]);

    const result = await askIAssistantAgent({
      message: `I just uploaded an academic ${type} attachment for reference.`,
      history: messages,
      contextType: contextType,
      contextData: { ...contextData, attachmentUrl: url },
      userState: user,
    });

    if (result.success && result.reply) {
      setMessages(prev => [...prev, { role: 'model', content: result.reply! }]);
    }
  };

  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
        loadingLabelText: 'Processing reference image...',
      });
      if (image.path) {
        const imageUrl = await uploadToFirebase(image.path);
        sendAttachmentMessage(imageUrl, 'image');
      }
    } catch (error: any) {
      if (
        error.message.includes('permission') ||
        error.message.includes('Required')
      ) {
        Alert.alert(
          'Permission Required',
          'iCampus needs access to your gallery to process images. Grant access in settings?',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (!error.message.includes('User cancelled')) {
        console.error('ImagePicker Error: ', error.message);
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [types.allFiles],
      });
      const { uri, name } = result;
      const docUrl = await uploadToFirebase(uri);
      sendAttachmentMessage(docUrl, 'file', name || 'Document');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Document Picker Error:', err);
        Toast.show({
          type: 'error',
          text1: 'Upload Error',
          text2: 'Failed to upload document reference',
        });
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      keyboardVerticalOffset={90}
    >
      <PageHeader
        title="Academic AI"
        subtitle={
          contextType === 'lecture'
            ? contextData?.topicName || 'Lecture Topic'
            : contextType === 'course'
            ? contextData?.courseTitle || 'Course View'
            : 'General Study Room'
        }
      />

      <FlatList
        ref={flatListRef}
        data={messages}
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
            iconName="school"
            title="No Academic History"
            subtitle="Ask a question about this course or assignment to initialize learning."
          />
        }
      />
      <ChatInput
        value={input}
        onChangeText={setInput}
        onSend={handleSendMessage}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder="Ask a study question..."
      />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
});