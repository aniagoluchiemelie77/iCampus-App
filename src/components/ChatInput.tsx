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
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';

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
  onTakePhoto?: () => void;
  colors: any;
}
export const AttachmentModal = ({
  isVisible,
  onClose,
  onPickImage,
  onPickDocument,
  onTakePhoto,
  colors,
}: AttachmentModalProps) => {
  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.title, { color: colors.textDarker }]}>
            Send Attachment
          </Text>

          <View style={styles.optionsGrid}>
            {/* Image Option */}
            <TouchableOpacity
              style={[styles.option, { borderColor: colors.border }]}
              onPress={() => {
                onPickImage();
                onClose();
              }}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: colors.primary }]}
              >
                <MaterialIcons name="image-outlined" size={28} color="#fff" />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Gallery
              </Text>
            </TouchableOpacity>

            {/* Document Option */}
            <TouchableOpacity
              style={[styles.option, { borderColor: colors.border }]}
              onPress={() => {
                onPickDocument();
                onClose();
              }}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: colors.primary }]}
              >
                <MaterialIcons
                  name="insert-drive-file-outlined"
                  size={28}
                  color="#fff"
                />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Document
              </Text>
            </TouchableOpacity>
            {onTakePhoto && (
              <TouchableOpacity
                style={[styles.option, { borderColor: colors.border }]}
                onPress={() => {
                  onTakePhoto();
                  onClose();
                }}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <MaterialIcons
                    name="photo-camera-outlined"
                    size={28}
                    color="#fff"
                  />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Camera
                </Text>
              </TouchableOpacity>
            )}
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
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.inputWrapper,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.backgroundSecondary, color: colors.text },
        ]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline
        placeholderTextColor={colors.inputTextHolder}
      />
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleAttachmentPress}
      >
        <MaterialIcons name="attach-file" size={26} color={colors.primary} />
      </TouchableOpacity>
      {value.trim().length > 0 && (
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.primary }]}
          onPress={onSend}
        >
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      <AttachmentModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPickImage={onPickImage}
        onPickDocument={onPickDocument}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 4,
    maxHeight: 120,
    fontSize: 15,
    textAlignVertical: 'center',
  },
  sendBtn: {
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
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  option: {
    alignItems: 'center',
    width: 80,
    borderWidth: 0.8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});