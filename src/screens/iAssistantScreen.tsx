import React, { useState, useRef} from 'react';
import {
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { baseUrl } from '../components/HomeScreenComponents';
import { PageHeader } from '../components/PageHeader.tsx';
import { useAppSelector } from '../components/hooks';
import { MessageBubble } from '../components/ChatMessageBubble.tsx';
import { ChatInput } from '../components/ChatInput.tsx';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;

export const Assistant = ({ route }: Props) => {
  const { contextType, contextData, initialMessage } = route.params;
  const user = useAppSelector(state => state.user);
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<
    { role: 'user' | 'model'; content: string }[]
  >([
    {
      role: 'model',
      content:
        initialMessage ||
        `Hi! I'm your iAssistant. I'm here to help. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const newMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    try {
      const response = await fetch(`${baseUrl}users/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: { type: contextType, data: contextData },
          history: messages,
          userId: user.uid,
        }),
      });

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        { role: 'model' as const, content: data.reply },
      ]);
    } catch (err) {
      console.error('AI Chat failed', err);
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
        onPickImage={() => console.log('image')}
        onPickDocument={() => console.log('doc')}
        placeholder="Ask iAssistant anything..."
      />
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