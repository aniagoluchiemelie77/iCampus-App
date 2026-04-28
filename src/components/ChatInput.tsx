import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { PRIMARY_COLOR } from 'assets/styles/colors';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onPickDocument: () => void;
  onPickImage: () => void;
  placeholder?: string;
}
interface AttachmentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
}
export const AttachmentModal = ({
  isVisible,
  onClose,
  onPickImage,
  onPickDocument,
}: AttachmentModalProps) => {
  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Send Attachment</Text>

          <View style={styles.optionsGrid}>
            {/* Image Option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onPickImage();
                onClose();
              }}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: PRIMARY_COLOR }]}
              >
                <MaterialIcons name="image" size={28} color="#fff" />
              </View>
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>

            {/* Document Option */}
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onPickDocument();
                onClose();
              }}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: PRIMARY_COLOR }]}
              >
                <MaterialIcons
                  name="insert-drive-file"
                  size={28}
                  color="#fff"
                />
              </View>
              <Text style={styles.optionText}>Document</Text>
            </TouchableOpacity>

            {/* Camera Option */}
            <TouchableOpacity style={styles.option} onPress={onClose}>
              <View
                style={[styles.iconCircle, { backgroundColor: PRIMARY_COLOR }]}
              >
                <MaterialIcons name="photo-camera" size={28} color="#fff" />
              </View>
              <Text style={styles.optionText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export const ChatInput = ({
  value,
  onChangeText,
  onSend,
  onPickDocument = () => {},
  onPickImage = () => {},
  placeholder = 'Type a message...',
}: ChatInputProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const handleAttachmentPress = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholderTextColor={PRIMARY_COLOR_TINT}
      />
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleAttachmentPress}
      >
        <MaterialIcons name="attach-file" size={26} color="#666" />
      </TouchableOpacity>
      {value.trim().length > 0 && (
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      <AttachmentModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPickImage={onPickImage}
        onPickDocument={onPickDocument}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'flex-end', 
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: PRIMARY_COLOR_TINT,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fadccc',
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 4,
    maxHeight: 120,
    color: '#222',
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendBtn: {
    backgroundColor: PRIMARY_COLOR, 
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#222',
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  option: {
    alignItems: 'center',
    width: 80,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4, // Android Shadow
    shadowColor: PRIMARY_COLOR_TINT, // iOS Shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  optionText: {
    fontSize: 13,
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
});