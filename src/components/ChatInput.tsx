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
  onPickDocument?: () => void;
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View
            style={[
              styles.grabber,
              { backgroundColor: colors.border || '#ccc' },
            ]}
          />
          <Text style={[styles.title, { color: colors.textDarker }]}>
            Share Content
          </Text>

          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                onPickImage();
                onClose();
              }}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      colors.primaryTint || colors.primary + '20',
                  },
                ]}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Gallery
              </Text>
            </TouchableOpacity>

            {onTakePhoto && (
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  onTakePhoto();
                  onClose();
                }}
              >
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor:
                        colors.primaryTint || colors.primary + '20',
                    },
                  ]}
                >
                  <MaterialIcons
                    name="add-a-photo"
                    size={30}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Camera
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                onPickDocument?.();
                onClose?.();
              }}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      colors.primaryTint || colors.primary + '20',
                  },
                ]}
              >
                <MaterialIcons
                  name="insert-drive-file"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Document
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
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
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleAttachmentPress}
          activeOpacity={0.7}
        >
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          multiline
          placeholderTextColor={colors.inputTextHolder}
        />
      </View>

      <TouchableOpacity
        style={[
          styles.sendBtn,
          {
            backgroundColor: colors.btnColor,
            opacity: value.trim().length > 0 ? 1 : 0.4,
          },
        ]}
        onPress={onSend}
        disabled={value.trim().length === 0}
        activeOpacity={0.8}
      >
        <MaterialIcons name="send" size={20} color={colors.btnTextColor} />
      </TouchableOpacity>

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
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 0.5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 55,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    maxHeight: 108,
    textAlignVertical: 'center',
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2, // Matches bottom alignment
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'left',
    letterSpacing: 0.3,
  },
  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  optionItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});