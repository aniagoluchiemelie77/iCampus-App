import React, { useState, useRef, useCallback, useEffect } from 'react';
import 'react-native-get-random-values';
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
import {
  uploadToFirebase,
  uploadFileToFirebaseClient,
} from '../utils/CloudinaryPresetHelper.ts';
import { errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import Toast from 'react-native-toast-message';
import { AssistantMessage } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
const uniqueMessageId = uuidv4();

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;

const MAX_MESSAGES = 20;
export const Assistant = ({ route }: Props) => {
  const { colors } = useTheme();
  const {
    contextType,
    contextData,
    initialMessage,
    assistantTitle = 'AI Assistant',
    placeholder = 'Type a message...',
  } = route.params;
  const STORAGE_KEY = `chat_messages_${contextType}_${contextData?.id || 'general'}`;
  const user = useAppSelector(state => state.user) || {};
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
  const { pickImage, pickDocument } = useMediaPicker();

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
      const fileData = await pickImage();
      if (fileData) {
        const imageUrl = await uploadToFirebase(fileData.uri);
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
      const fileData = await pickDocument();
      if (fileData) {
        const response = await uploadFileToFirebaseClient(
          fileData.uri,
          'chat-attachments',
        );
        if (response.success && response.data?.permanentUrl) {
          const docUrl = response.data.permanentUrl;
          handleAttachment(docUrl, 'file', 'Document');
        }
      }
    } catch (err: any) {
      if (!(
        isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED
      )) {
        Toast.show({
          type: 'error',
          text1: 'Document Error',
          text2: 'Attachment process failed.',
        });
      }
    }
  };
  const onContentSizeChange = () =>
    flatListRef.current?.scrollToEnd({ animated: true });
  const loadStoredMessages = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  };
  const saveMessages = async (newMessages: AssistantMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  };
  const addMessage = useCallback((msg: AssistantMessage) => {
    setMessages(prev => {
      const updated = [{ ...msg, id: uniqueMessageId }, ...prev];
      const limitedMessages = updated.slice(0, MAX_MESSAGES);
      saveMessages(limitedMessages);
      return limitedMessages;
    });
  }, []);
  useEffect(() => {
    loadStoredMessages();
  }, []);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
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
        inverted={true}
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
  },
});
