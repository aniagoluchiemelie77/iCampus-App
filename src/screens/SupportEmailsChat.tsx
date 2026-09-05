import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import {
  uploadToFirebase,
  uploadFileToFirebaseClient,
} from '../utils/CloudinaryPresetHelper.ts';
import { errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';
import { useTheme } from '../context/ThemeContext';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import { sendSupportMessageApi } from '../api/localPostApis.ts'; 
import { fetchSupportTicketByRefIdAPI } from '../api/localGetApis.ts'; 
import { PageHeader } from '../components/PageHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportChat'>;

export const SupportChatScreen = ({ route }: Props) => {
  const { colors } = useTheme();
  const { ticketRefId } = route.params;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [ticketDetails, setTicketDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const { pickImage, pickDocument } = useMediaPicker();

useEffect(() => {
  let isMounted = true;
  const fetchTicketThread = async () => {
    try {
      setLoading(true);
      const result = await fetchSupportTicketByRefIdAPI({ ticketRefId });
      
      if (result.success && result.ticket && isMounted) {
        const currentTicket = result.ticket;
        setTicketDetails(currentTicket);
        const formattedThread = (currentTicket.thread || []).map((msg: any, index: number) => ({
          id: `${index}_${msg.timestamp}`,
          text: msg.message,
          isUser: msg.sender !== (currentTicket.guestEmail || currentTicket.userId),
          timestamp: msg.timestamp,
          attachments: msg.attachments || [],
        })).reverse();
        if (formattedThread.length === 0 && currentTicket.originalMessage) {
          formattedThread.push({
            id: 'original_msg',
            text: currentTicket.originalMessage,
            isUser: false,
            timestamp: currentTicket.createdAt,
            attachments: [],
          });
        }

        setMessages(formattedThread);
      }
    } catch (error) {
      console.error('Failed fetching ticket support thread:', error);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  fetchTicketThread();
  return () => {
    isMounted = false;
  };
}, [ticketRefId]);

  const handleSendMessage = async (textToSend: string, attachments: any[] = []) => {
    if (!textToSend.trim() && attachments.length === 0) return;

    const optimisticMessage = {
      id: `local_${Date.now()}`,
      text: textToSend,
      isUser: true,
      timestamp: new Date().toISOString(),
      attachments,
    };

    setMessages(prev => [optimisticMessage, ...prev]);
    setInputText('');
    setSending(true);

    try {
      const response = await sendSupportMessageApi(ticketRefId, {
        message: textToSend,
        attachments,
      });

      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Failed to Send',
          text2: response.error || 'Could not dispatch message.',
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'Failed to send message.',
      });
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const fileData = await pickImage();
      if (fileData) {
        const imageUrl = await uploadToFirebase(fileData.uri);
        handleSendMessage('Sent an image', [{ url: imageUrl, type: 'image', fileName: 'attachment.jpg' }]);
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Toast.show({ type: 'error', text1: 'Media Error', text2: 'Could not attach image.' });
      }
    }
  };

  const handlePickDocument = async () => {
    const fileData = await pickDocument();
    if (fileData) {
      try {
        const response = await uploadFileToFirebaseClient(fileData.uri, 'chat-attachments');
        if (response.success && response.data?.permanentUrl) {
          handleSendMessage(`Shared: ${fileData.name || 'Document'}`, [
            { url: response.data.permanentUrl, type: 'file', fileName: fileData.name || 'Document' },
          ]);
        }
      } catch (err: any) {
        if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
          Toast.show({ type: 'error', text1: 'Document Error', text2: 'Attachment process failed.' });
        }
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <PageHeader title="Support Inquiry" subtitle={`#${ticketRefId}`} />

      {/* Message List */}
      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted={true}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.text}
              isUser={item.isUser}
              type="p2p"
              timestamp={item.timestamp}
              status="sent"
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="speaker-notes-off"
              title="No Thread History"
              subtitle="Start the conversation by sending a message below."
            />
          }
        />
      )}

      {/* Input Field */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={() => handleSendMessage(inputText)}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder="Type your reply..."
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  centerLoader: { flex: 1, alignContent: 'center' },
});