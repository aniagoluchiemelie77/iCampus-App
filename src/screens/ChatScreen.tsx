import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Text,
  Alert,
  Linking,
} from 'react-native';
import Toast from 'react-native-toast-message';
import toastConfig from '@components/ToastConfig';
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
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors.ts';
import { uploadToCloudinary } from '../utils/CloudinaryPresetHelper.ts';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export const ChatScreen = ({ route, navigation }: Props) => {
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
        const response = await fetch(
          `${baseUrl}users/messages/fetchMessage/${currentUser.uid}/${recipientId}?page=${pageNum}&limit=20`,
        );
        const result = await response.json();

        if (result.success) {
          // If loading page 1, set fresh. If loading more, append to the TOP (prev)
          setMessages(prev =>
            pageNum === 1 ? result.data : [...result.data, ...prev],
          );
          setHasMore(result.hasMore);
          setPage(pageNum); // Now 'page' is being used!

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
      const docUrl = await uploadToCloudinary(uri);
      // 2. Send the message
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
        const response = await fetch(
          `${baseUrl}users/search?uid=${recipientId}`,
        );
        const result = await response.json();

        if (result.success) {
          setRecipient(result.data);
        }
      } catch (error) {
        console.error('Failed to load recipient details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipientDetails();
  }, [recipientId]);
  useEffect(() => {
    loadHistory(1);

    // Listen for seen updates
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
    // 2. Join a private room for these two users
    const roomId = [currentUser.uid, recipientId].sort().join('_');
    socketRef.current.emit('join_chat', { roomId });

    // 3. Listen for incoming messages
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

    // 1. Explicitly type the object as ChatMessage
    const messageData: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      senderId: currentUser.uid,
      recipientId,
      // Add these missing required fields from your interface:
      firstName: currentUser.firstname || 'User',
      lastName: currentUser.lastname || '',
      profilePic: currentUser.profilePic?.[0] || '',
      // Metadata
      timestamp: new Date().toISOString(),
      status: 'sent', // Ensure this matches your 'sending' | 'sent' | 'seen' type
    };

    // 2. Emit to backend (include recipientId in the socket payload)
    socketRef.current?.emit('send_private_message', {
      ...messageData,
      recipientId: recipientId,
    });

    // 3. Update UI locally
    // TypeScript will now be happy because messageData matches ChatMessage[]
    setMessages(prev => [...prev, messageData]);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* 1. Header with Identity */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        {!loading && recipient ? (
          <View style={styles.profileSummary}>
            <Image
              source={{
                uri:
                  recipient.profilePic?.[0] || 'https://via.placeholder.com/40',
              }}
              style={styles.headerAvatar}
            />
            <UserIdentity
              firstname={recipient?.firstname ?? ''}
              lastname={recipient?.lastname ?? ''}
              tier={recipient?.tier ?? 'free'} // If tier is optional in UserIdentityProps, this is fine
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

      {/* 2. Message List */}
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

      {/* 3. Input Area */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        placeholder={`Send ${recipient?.firstname} a message...`}
      />
      <Toast config={toastConfig} />
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, // LinkedIn Light Grey
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fadccc',
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
});
