import React, { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { useAppSelector } from '../hooks/hooks.ts';
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
  const {
    contextType,
    contextData,
    initialMessage,
    assistantTitle = 'AI Assistant',
    placeholder = 'Type a message...',
  } = route.params;
  const user = useAppSelector(state => state.user);
  const flatListRef = useRef<FlatList>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'model',
      content:
        initialMessage ||
        `Hello! I am your ${assistantTitle}. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const addMessage = useCallback((msg: AssistantMessage) => {
    setMessages(prev => [...prev, { ...msg, id: uuidv4() }]);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userText });
    setIsProcessing(true);

    try {
      const result = await askIAssistantAgent({
        message: userText,
        history: messages,
        contextType,
        contextData,
        userState: user,
      });

      if (result.success && result.reply) {
        addMessage({ role: 'model', content: result.reply });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Server unreachable',
          text2: 'Try again shortly.',
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Tutor Offline',
        text2: 'Try again shortly.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAttachment = async (
    url: string,
    type: 'image' | 'file',
    fileName?: string,
  ) => {
    setIsProcessing(true);
    addMessage({
      role: 'user',
      content: type === 'image' ? '[Sent image]' : `[Shared: ${fileName}]`,
      attachments: [{ url, type, fileName: fileName || 'file' }],
    });

    try {
      const result = await askIAssistantAgent({
        message: `I uploaded an academic ${type}.`,
        history: messages,
        contextType,
        contextData: { ...contextData, attachmentUrl: url },
        userState: user,
      });

      if (result.success) {
        addMessage({ role: 'model', content: result.reply! });
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Analysis Failed',
        text2: 'Could not process attachment.',
      });
    } finally {
      setIsProcessing(false);
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
        handleAttachment(imageUrl, 'image');
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
      handleAttachment(docUrl, 'file', name || 'Document');
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
  const onContentSizeChange = () =>
    flatListRef.current?.scrollToEnd({ animated: true });
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
        title={assistantTitle}
        subtitle={contextData?.title || contextData?.name || 'Support Chat'}
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        onContentSizeChange={onContentSizeChange}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.content}
            isUser={item.role === 'user'}
            type="ai"
            attachments={item.attachments}
            status={item.status}
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
        placeholder={placeholder}
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
