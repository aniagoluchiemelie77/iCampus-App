import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  Alert,
  Linking,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { searchUsers, fetchMessages } from '../api/localGetApis.ts';
import { UserIdentity } from '../components/UserIdentity';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { useAppSelector } from '../components/hooks';
import { ChatInput } from '../components/ChatInput.tsx';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';
import { ChatMessage, User } from '../types/firebase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { PRIMARY_COLOR, } from 'assets/styles/colors.ts';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const loadHistory = useCallback(
    async (pageNum = 1) => {
      try {
        const result = await fetchMessages(recipientId, pageNum);
        if (result.success) {
          setMessages(prev =>
            pageNum === 1 ? result.data : [...result.data, ...prev],
          );
          setHasMore(result.hasMore);
          setPage(pageNum);
          socketRef.current?.emit('mark_as_seen', {
            readerId: currentUser.uid,
            senderId: recipientId,
          });
        }
      } catch (err) {
        console.error('History load failed', err);
      }
    },
    [currentUser.uid, recipientId],
  );
  const handleLoadMore = () => {
    if (hasMore) {
      loadHistory(page + 1);
    }
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
  const sendAttachmentMessage = (
    url: string,
    type: 'image' | 'file',
    fileName?: string,
  ) => {
    const messageData: ChatMessage = {
      id: Date.now().toString(),
      text: type === 'image' ? 'Sent an image' : `Shared: ${fileName}`,
      senderId: currentUser.uid,
      firstName: currentUser.firstname || 'User',
      lastName: currentUser.lastname || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
      attachments: [
        {
          url: url,
          type,
          fileName: fileName || 'attachment',
        },
      ],
    };

    socketRef.current?.emit('send_private_message', messageData);
    setMessages(prev => [...prev, messageData]);
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

  useEffect(() => {
    const fetchRecipientDetails = async () => {
      try {
        setLoading(true);
        const response = await searchUsers(
          recipientId,
          currentUser?.tier!,
          currentUser?.usertype!,
        );
        if ((response as any).success) {
          const result = (response as any).data;
          if (Array.isArray(result) && result.length > 0) {
            setRecipient(result[0]);
          } else if (!Array.isArray(result) && result) {
            setRecipient(result);
          }
        }
      } catch (error) {
        console.error('Failed to load recipient details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipientDetails();
  }, [recipientId, currentUser?.tier, currentUser?.usertype]);
  useEffect(() => {
    loadHistory(1);
    socketRef.current?.on(
      'messages_seen',
      ({ readerId }: { readerId: string }) => {
        if (readerId === recipientId) {
          setMessages(prev => prev.map(m => ({ ...m, status: 'seen' })));
        }
      },
    );
    socketRef.current?.on(
      'status_update',
      ({
        messageId,
        status,
      }: {
        messageId: string;
        status: ChatMessage['status'];
      }) => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, status: status } : msg,
          ),
        );
      },
    );

    return () => {
      socketRef.current?.off('messages_seen');
      socketRef.current?.off('status_update');
    };
  }, [loadHistory, recipientId]);
  useEffect(() => {
    if (!currentUser?.uid) return;
    socketRef.current = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: currentUser.uid },
    });
    const roomId = [currentUser.uid, recipientId].sort().join('_');
    socketRef.current.emit('join_chat', { roomId });
    socketRef.current.on('receive_message', (newMessage: any) => {
      setMessages(prev => [...prev, newMessage]);
      socketRef.current?.emit('msg_delivered', {
        messageId: newMessage.id,
        senderId: newMessage.senderId,
      });
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser.uid, recipientId]);

  const sendMessage = () => {
    if (inputText.trim().length === 0 || !recipient) return;
    const messageData: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      senderId: currentUser.uid,
      recipientId,
      firstName: currentUser.firstname || 'User',
      lastName: currentUser.lastname || '',
      profilePic: currentUser.profilePic?.[0] || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    socketRef.current?.emit('send_private_message', {
      ...messageData,
      recipientId: recipientId,
    });
    setMessages(prev => [...prev, messageData]);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.header, {backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.text}]}>
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
            <Text style={{ color: PRIMARY_COLOR }}>Connecting...</Text>
          </View>
        )}
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            content={item.text}
            isUser={item.senderId === currentUser.uid}
            type="p2p"
            timestamp={item.timestamp}
            status={item.status}
          />
        )}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        onContentSizeChange={() => {
          if (page === 1) flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <EmptyState
            iconName="speaker-notes-off-outlined"
            title="No Messages Yet"
            subtitle="We couldn't find any messages for you. Be the first to say Hi"
          />
        }
      />
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder={`Send ${recipient?.firstname} a message...`}
      />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.8,
    marginHorizontal: -15
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    flex: 1
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },
});
