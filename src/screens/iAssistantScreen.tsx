import React, { useState, useRef} from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, TouchableOpacity, Platform } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import baseUrl, { PRIMARY_COLOR_TINT, PRIMARY_COLOR} from '../components/Classroomcomponent'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PageHeader } from '../components/PageHeader.tsx';

type Props = StackScreenProps<RootStackParamList, 'Assistant'>;

export const Assistant = ({ route }: Props) => {
  const { contextType, contextData, initialMessage } = route.params;
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
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={item.role === 'user' ? styles.userText : styles.aiText}
              >
                {item.content}
              </Text>
              <View
                style={[styles.tail, isUser ? styles.userTail : styles.aiTail]}
              />
            </View>
          );
        }}
        keyExtractor={(_, index) => index.toString()}
      />

      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
          <Icon name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
  bubble: {
    padding: 12,
    borderRadius: 18,
    marginVertical: 10,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: PRIMARY_COLOR,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: PRIMARY_COLOR_TINT,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 0.8,
    borderTopColor: PRIMARY_COLOR_TINT,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
    color: '#222',
  },
  sendBtn: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tail: {
    position: 'absolute',
    width: 10,
    height: 10,
    bottom: 0,
    transform: [{ rotate: '45deg' }],
  },
  userTail: {
    right: -4,
    bottom: 5,
    backgroundColor: PRIMARY_COLOR,
  },
  aiTail: {
    left: -4,
    bottom: 5,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
});