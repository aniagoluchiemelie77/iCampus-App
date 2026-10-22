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
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../App';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppSelector } from '../hooks/hooks.ts';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { askIAssistantAgent } from '../api/localPostApis.ts';
import {
  uploadToCloudinary,
  uploadFileToFirebaseClient,
} from '../utils/CloudinaryPresetHelper.ts';
import { errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import Toast from 'react-native-toast-message';
import { AssistantMessage } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TypingBubble } from '../components/ChatMarkdown';

// The list stores newest first (it is inverted); the backend and Gemini need
// the conversation oldest first.
const toChronologicalHistory = (messages: AssistantMessage[]) =>
  [...messages].reverse().map(m => ({ role: m.role, content: m.content }));

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;
type PendingRequest = {
  message: string;
  attachmentUrl?: string;
  /** Conversation before this message, captured when it was sent. */
  history: { role: 'user' | 'model'; content: string }[];
};

const MAX_MESSAGES = 40;
const SUGGESTIONS = [
  'Explain this topic simply',
  'Quiz me with 3 questions',
  'Summarise my notes',
  'Help me plan my study week',
];

export const Assistant = ({ route }: Props) => {
  const { colors } = useTheme();
  const {
    contextType,
    contextData,
    initialMessage,
    assistantTitle = 'iAssistant',
    placeholder = 'Ask me anything…',
  } = route.params;
  const contextKey =
    contextData?.id || contextData?.courseCode || contextData?.topicName || 'general';
  const STORAGE_KEY = `chat_messages_${contextType}_${contextKey}`;
  const user = useAppSelector(state => state.user) || {};
  const flatListRef = useRef<FlatList>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // The last request that failed, so the user can retry it in place.
  const [failed, setFailed] = useState<{ error: string; request: PendingRequest } | null>(null);

  const greeting: AssistantMessage = {
    role: 'model',
    content:
      initialMessage ||
      `Hey${user?.firstname ? ` ${user.firstname}` : ''}! I'm ${assistantTitle}. Ask me about a topic, a past question, or share a photo of your notes.`,
  };
  const [messages, setMessages] = useState<AssistantMessage[]>([greeting]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [input, setInput] = useState('');
  const { pickImage, pickDocument } = useMediaPicker();

  const saveMessages = (list: AssistantMessage[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)).catch(() => {});
  };

  const addMessage = useCallback((msg: AssistantMessage) => {
    setMessages(prev => {
      const updated = [{ ...msg, id: uuidv4() } as AssistantMessage, ...prev].slice(0, MAX_MESSAGES);
      saveMessages(updated);
      return updated;
    });
    // Inverted list: the newest message lives at offset 0.
    requestAnimationFrame(() =>
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sends one request and shows the reply, or an inline retry on failure. */
  const ask = useCallback(
    async (request: PendingRequest) => {
      setIsProcessing(true);
      setFailed(null);
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
      );
      try {
        const result = await askIAssistantAgent({
          message: request.message,
          history: request.history,
          contextType,
          contextData: request.attachmentUrl
            ? { ...contextData, attachmentUrl: request.attachmentUrl }
            : contextData,
          userState: user,
        });
        if (result.success && result.reply) {
          addMessage({ role: 'model', content: result.reply.trim() });
        } else {
          setFailed({ error: result.error || 'The assistant could not answer.', request });
        }
      } catch {
        setFailed({ error: "Couldn't reach the assistant. Check your connection.", request });
      } finally {
        setIsProcessing(false);
      }
    },
    [addMessage, contextData, contextType, user],
  );

  const sendText = (text: string) => {
    const userText = text.trim();
    if (!userText || isProcessing) return;
    setInput('');
    // History is captured before the new message is added (it goes as `message`).
    const history = toChronologicalHistory(messagesRef.current);
    addMessage({ role: 'user', content: userText });
    ask({ message: userText, history });
  };

  const handleAttachment = (url: string, type: 'image' | 'file', fileName?: string) => {
    const history = toChronologicalHistory(messagesRef.current);
    addMessage({
      role: 'user',
      content: type === 'image' ? 'Can you look at this?' : `Can you go through ${fileName || 'this document'}?`,
      attachments: [{ url, type, fileName: fileName || 'file' }],
    });
    ask({
      message:
        type === 'image'
          ? 'I shared an image. Explain what it shows and help me with it.'
          : 'I shared a document. Summarise it and point out the key points.',
      attachmentUrl: url,
      history,
    });
  };

  const handlePickImage = async () => {
    if (isProcessing || isUploading) return;
    try {
      const fileData = await pickImage();
      if (!fileData) return;
      setIsUploading(true);
      const imageUrl = await uploadToCloudinary(fileData.uri);
      handleAttachment(imageUrl, 'image');
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('permission') || msg.includes('Required')) {
        Alert.alert(
          'Permission Required',
          'iCampus needs access to your gallery to share images. Grant access in Settings?',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      } else if (!msg.includes('cancel')) {
        Toast.show({ type: 'error', text1: 'Image upload failed', text2: 'Check your connection and try again.' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickDocument = async () => {
    if (isProcessing || isUploading) return;
    try {
      const fileData = await pickDocument();
      if (!fileData) return;
      setIsUploading(true);
      const response = await uploadFileToFirebaseClient(fileData.uri, 'chat-attachments');
      if (response.success && response.data?.permanentUrl) {
        handleAttachment(response.data.permanentUrl, 'file', fileData.name || 'Document');
      } else {
        Toast.show({ type: 'error', text1: 'Upload failed', text2: response.message });
      }
    } catch (err: any) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        Toast.show({ type: 'error', text1: 'Document error', text2: 'Could not attach that file.' });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearChat = () => {
    Alert.alert('Start a new chat?', 'This clears the conversation on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setFailed(null);
          setMessages([greeting]);
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        },
      },
    ]);
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: AssistantMessage[] = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Older saves gave every message the same id; re-key on load.
          setMessages(parsed.map(m => ({ ...m, id: uuidv4() }) as AssistantMessage));
        }
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  const onlyGreeting = messages.length <= 1 && !isProcessing;

  // Inverted list: the header renders at the bottom, right above the input.
  const listFooterAtBottom = (
    <View>
      {(isProcessing || isUploading) && (
        <TypingBubble
          background={colors.backgroundSecondary}
          dotColor={colors.primary}
          label={isUploading ? 'Uploading your file' : `${assistantTitle} is typing`}
        />
      )}
      {failed && !isProcessing && (
        <View style={[styles.errorCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
          <MaterialIcons name="error-outline" size={18} color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{failed.error}</Text>
          <TouchableOpacity
            onPress={() => ask(failed.request)}
            style={[styles.retryBtn, { backgroundColor: colors.btnColor }]}
            accessibilityRole="button"
          >
            <MaterialIcons name="refresh" size={15} color={colors.btnTextColor} />
            <Text style={[styles.retryText, { color: colors.btnTextColor }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {onlyGreeting && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => sendText(s)}
              style={[styles.suggestionChip, { borderColor: colors.primary + '55', backgroundColor: colors.backgroundSecondary }]}
            >
              <Text style={[styles.suggestionText, { color: colors.textDarker }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <PageHeader
        title={assistantTitle}
        subtitle={
          isProcessing
            ? 'typing…'
            : contextData?.courseCode || contextData?.title || contextData?.topicName || 'Your study buddy'
        }
        rightElement={
          <TouchableOpacity onPress={clearChat} accessibilityLabel="New chat" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <MaterialIcons name="add-comment" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listFooterAtBottom}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.content}
            isUser={item.role === 'user'}
            type="ai"
            attachments={item.attachments}
            status={item.status}
          />
        )}
        keyExtractor={(item, index) => (item as any).id || `msg-${index}`}
      />
      <ChatInput
        value={input}
        onChangeText={setInput}
        onSend={() => sendText(input)}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder={isProcessing ? `${assistantTitle} is replying…` : placeholder}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingVertical: 8 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  retryText: { fontSize: 12.5, fontWeight: '800' },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
  },
  suggestionChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  suggestionText: { fontSize: 13, fontWeight: '600' },
});
