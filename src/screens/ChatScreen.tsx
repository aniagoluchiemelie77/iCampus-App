import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { searchUsers, fetchMessages } from '../api/localGetApis.ts';
import { deleteMessageApi } from '../api/localDeleteApis.ts';
import { editMessageApi } from '../api/localPatchApis.ts';
import { UserIdentity } from '../components/UserIdentity';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { useAppSelector } from '../hooks/hooks.ts';
import { ChatInput } from '../components/ChatInput.tsx';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';
import { ChatMessage, User } from '../types/firebase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { uploadToFirebase } from '../utils/CloudinaryPresetHelper.ts';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';
import { UserAvatar } from '../components/UserAvatar';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { recipientId } = route.params;
  const currentUser = useAppSelector(state => state.user);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inputText, setInputText] = useState('');

  const stateRef = useRef({
    messages,
    recipientId,
    currentUserId: currentUser.uid,
  });
  useEffect(() => {
    stateRef.current = {
      messages,
      recipientId,
      currentUserId: currentUser.uid,
    };
  });
  const loadHistory = useCallback(
    async (pageNum = 1) => {
      if (pageNum > 1 && historyLoading) return;
      try {
        if (pageNum > 1) setHistoryLoading(true);
        const result = await fetchMessages(recipientId, pageNum);

        if (result.success) {
          setMessages(prev => {
            return pageNum === 1 ? result.data : [...prev, ...result.data];
          });
          setHasMore(result.hasMore);
          setPage(pageNum);
          socketRef.current?.emit('mark_as_seen', {
            readerId: currentUser.uid,
            senderId: recipientId,
          });
        }
      } catch (err) {
        console.error('Unified history engine fault:', err);
      } finally {
        setHistoryLoading(false);
      }
    },
    [currentUser.uid, recipientId, historyLoading],
  );

  const handleLoadMore = () => {
    if (hasMore && !historyLoading) {
      loadHistory(page + 1);
    }
  };
  useEffect(() => {
    if (!currentUser?.uid) return;
    const socketInstance = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: currentUser.uid },
      autoConnect: true,
    });
    socketRef.current = socketInstance;
    const roomId = [currentUser.uid, recipientId].sort().join('_');
    socketInstance.emit('join_chat', { roomId });
    loadHistory(1);

    socketInstance.on('receive_message', (newMessage: ChatMessage) => {
      setMessages(prev =>
        prev.some(m => m.id === newMessage.id) ? prev : [newMessage, ...prev],
      );
      socketInstance.emit('msg_delivered', {
        messageId: newMessage.id,
        senderId: newMessage.senderId,
      });
    });

    socketInstance.on('messages_seen', ({ readerId }: { readerId: string }) => {
      if (readerId === stateRef.current.recipientId) {
        setMessages(prev =>
          prev.map(m => (m.status !== 'seen' ? { ...m, status: 'seen' } : m)),
        );
      }
    });

    socketInstance.on(
      'status_update',
      ({
        messageId,
        status,
      }: {
        messageId: string;
        status: ChatMessage['status'];
      }) => {
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? { ...msg, status } : msg)),
        );
      },
    );
    return () => {
      socketInstance.off('receive_message');
      socketInstance.off('messages_seen');
      socketInstance.off('status_update');
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [currentUser.uid, recipientId, loadHistory]);

  useEffect(() => {
    let isMounted = true;
    const fetchRecipientDetails = async () => {
      try {
        setLoading(true);
        const response = await searchUsers({
          uid: recipientId,
          viewerTier: currentUser.tier || 'free',
          viewerRole: currentUser.usertype || 'student',
        });
        if (isMounted && (response as any).success) {
          const result = (response as any).data;
          setRecipient(Array.isArray(result) ? result[0] : result);
        }
      } catch (error) {
        console.error('Failed parsing recipient profile details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchRecipientDetails();
    return () => {
      isMounted = false;
    };
  }, [recipientId, currentUser?.tier, currentUser?.usertype]);

  const sendMessage = () => {
    if (inputText.trim().length === 0 || !recipient) return;

    const messageData: ChatMessage = {
      id: `local_${Date.now()}`,
      text: inputText.trim(),
      senderId: currentUser.uid,
      recipientId,
      firstName: currentUser.firstname || 'User',
      lastName: currentUser.lastname || '',
      profilePic: currentUser.profilePic?.[0] || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };

    socketRef.current?.emit('send_private_message', messageData);
    setMessages(prev => [messageData, ...prev]);
    setInputText('');
  };

  const sendAttachmentMessage = (
    url: string,
    type: 'image' | 'file',
    fileName?: string,
  ) => {
    const messageData: ChatMessage = {
      id: `local_${Date.now()}`,
      text: type === 'image' ? 'Sent an image' : `Shared: ${fileName}`,
      senderId: currentUser.uid,
      recipientId,
      firstName: currentUser.firstname || 'User',
      lastName: currentUser.lastname || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
      attachments: [{ url, type, fileName: fileName || 'attachment' }],
    };

    socketRef.current?.emit('send_private_message', messageData);
    setMessages(prev => [messageData, ...prev]);
  };

  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 1200,
        height: 1200,
        cropping: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });
      if (image.path) {
        const imageUrl = await uploadToFirebase(image.path);
        sendAttachmentMessage(imageUrl, 'image');
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Toast.show({
          type: 'error',
          text1: 'Media Error',
          text2: 'Could not attach image asset.',
        });
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [types.allFiles],
      });
      const docUrl = await uploadToFirebase(result.uri);
      sendAttachmentMessage(docUrl, 'file', result.name || 'Document');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Toast.show({
          type: 'error',
          text1: 'Document Error',
          text2: 'Attachment process failed.',
        });
      }
    }
  };
  const handleEditRequest = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setInputText(message.text ?? '');
  };

  const deleteMessage = async (messageId: string) => {
    const previousMessages = [...messages];

    try {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, status: 'deleted', text: 'You deleted this message' }
            : m,
        ),
      );
      const response = await deleteMessageApi(messageId);
      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Delete Failed',
          text2:
            response.error || 'Could not delete the message. Please try again.',
        });
      }
      socketRef.current?.emit('delete_message', {
        messageId,
        recipientId,
      });
    } catch (error) {
      console.error('Delete failed', error);
      setMessages(previousMessages);
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: 'Could not delete the message. Please try again.',
      });
    }
  };

  const updateMessage = async (messageId: string, newText: string) => {
    const previousMessages = [...messages];

    try {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, text: newText, isEdited: true } : m,
        ),
      );
      const response = await editMessageApi(messageId, newText);

      if (!response.success) {
        Toast.show({
          type: 'error',
          text1: 'Edit Failed',
          text2:
            response.error || 'Could not update the message. Please try again.',
        });
      }
      socketRef.current?.emit('edit_message', {
        messageId,
        newText,
        recipientId,
      });
      Toast.show({
        type: 'success',
        text1: 'Message Updated',
      });
    } catch (error) {
      console.error('Edit failed', error);
      setMessages(previousMessages);
      Toast.show({
        type: 'error',
        text1: 'Edit Failed',
        text2: 'Could not update the message. Please try again.',
      });
    }
  };
  const handleSendMessage = async () => {
    if (editingMessageId) {
      await updateMessage(editingMessageId, inputText.trim());
      setEditingMessageId(null);
    } else {
      sendMessage();
    }
    setInputText('');
  };

  useEffect(() => {
    if (!currentUser?.uid) return;

    const socketInstance = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: currentUser.uid },
      autoConnect: true,
    });
    socketRef.current = socketInstance;

    const roomId = [currentUser.uid, recipientId].sort().join('_');
    socketInstance.emit('join_chat', { roomId });
    loadHistory(1);

    socketInstance.on('receive_message', (newMessage: ChatMessage) => {
      setMessages(prev =>
        prev.some(m => m.id === newMessage.id) ? prev : [newMessage, ...prev],
      );
      socketInstance.emit('msg_delivered', {
        messageId: newMessage.id,
        senderId: newMessage.senderId,
      });
    });
    socketInstance.on('messages_seen', ({ readerId }: { readerId: string }) => {
      if (readerId === stateRef.current.recipientId) {
        setMessages(prev =>
          prev.map(m => (m.status !== 'seen' ? { ...m, status: 'seen' } : m)),
        );
      }
    });
    socketInstance.on(
      'status_update',
      ({
        messageId,
        status,
      }: {
        messageId: string;
        status: ChatMessage['status'];
      }) => {
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? { ...msg, status } : msg)),
        );
      },
    );

    socketInstance.on(
      'message_edited',
      ({ messageId, newText }: { messageId: string; newText: string }) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId ? { ...m, text: newText, isEdited: true } : m,
          ),
        );
      },
    );

    socketInstance.on(
      'message_deleted',
      ({ messageId }: { messageId: string }) => {
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? {
                  ...m,
                  status: 'deleted',
                  text: `${
                    recipient?.firstname || 'The other user'
                  } deleted this message`,
                }
              : m,
          ),
        );
      },
    );
    return () => {
      socketInstance.off('receive_message');
      socketInstance.off('messages_seen');
      socketInstance.off('status_update');
      socketInstance.off('message_edited');
      socketInstance.off('message_deleted');
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [currentUser.uid, recipientId, loadHistory, recipient]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header Panel Component Row */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.backgroundSecondary,
            borderBottomColor: colors.text,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        {!loading && recipient ? (
          <View style={styles.profileSummary}>
            <UserAvatar
              profilePic={recipient.profilePic}
              firstName={recipient?.firstname}
              lastName={recipient?.username}
              organizationName={recipient?.organizationName}
              style={styles.headerAvatar}
            />
            <UserIdentity
              firstname={recipient?.firstname ?? ''}
              lastname={recipient?.lastname ?? ''}
              username={recipient?.username}
              tier={recipient?.tier ?? 'free'}
              isVerified={recipient?.isVerified ?? false}
              organizationName={recipient?.organizationName ?? ''}
              size="medium"
              containerStyle={{ marginLeft: 8 }}
            />
          </View>
        ) : (
          <View style={{ marginLeft: 15 }}>
            <Text style={{ color: colors.primary }}>Connecting...</Text>
          </View>
        )}
      </View>

      {/* Optimized Inverted Production Core Chat FlatList */}
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted={true}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.text}
            isUser={item.senderId === currentUser.uid}
            type="p2p"
            timestamp={item.timestamp}
            status={item.status}
            onEdit={() => handleEditRequest(item)}
            onDelete={() => deleteMessage(item.id)}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          historyLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={{ marginVertical: 10 }}
            />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              iconName="speaker-notes-off-outlined"
              title="No Messages Yet"
              subtitle="Say hi to begin your conversation securely."
            />
          ) : null
        }
      />
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSendMessage}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder={`Send ${recipient?.firstname || 'message'}...`}
      />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, position: 'relative' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.8,
    marginHorizontal: -15,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
});
