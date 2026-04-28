import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet} from 'react-native';
import { UserIdentity } from '../components/UserIdentity'; // Reuse your component!
import { MaterialIcons } from '@expo/vector-icons';

export const ChatScreen = ({ route, navigation }) => {
  const { recipientId, recipientName } = route.params; // Passed from RankCard
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (inputText.trim().length === 0) return;
    
    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      senderId: 'currentUser_ID', // Replace with your auth state
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputText('');
    // TODO: Emit socket event here
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
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <UserIdentity 
          firstname={recipientName?.split(' ')[0]} 
          lastname={recipientName?.split(' ')[1]} 
          size="medium"
          containerStyle={{ marginLeft: 10 }}
        />
      </View>

      {/* 2. Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isMine={item.senderId === 'currentUser_ID'} />
        )}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* 3. Input Area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachBtn}>
          <MaterialIcons name="add" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Write a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F2EF' }, // LinkedIn Light Grey
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F2EF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
    maxHeight: 100,
  },
  sendText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginRight: 5,
  },
  // Bubble Styles
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY_COLOR,
    padding: 12,
    borderRadius: 15,
    borderTopRightRadius: 2,
    margin: 5,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 15,
    borderTopLeftRadius: 2,
    margin: 5,
  }
});