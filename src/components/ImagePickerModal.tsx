import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import Modal from 'react-native-modal';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: 'camera' | 'library') => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ 
  visible, 
  onClose, 
  onSelect 
}) => {
    const { colors } = useTheme();
    return(
  <Modal isVisible={visible} swipeDirection="down" onBackdropPress={() => onClose()} onSwipeComplete={() => onClose()} style={styles.modalOverride}>
    <View style={styles.overlay}>
      <View style={[styles.modalContent, {backgroundColor: colors.backgroundSecondary}]}>
        <TouchableOpacity style={styles.option} onPress={() => onSelect('camera')}>
          <MaterialIcons name="camera-alt-outlined" size={24} color={colors.textDarker} />
          <Text style={[styles.text, {color: colors.textDarker}]}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => onSelect('library')}>
          <MaterialIcons name="add-photo-alternate-outlined" size={24} color={colors.textDarker} />
          <Text style={[styles.text, {color: colors.textDarker}]}>Choose from Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
)};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { padding: 20, borderTopLeftRadius: 25, borderTopRightRadius: 25, flexDirection: 'row', alignItems: 'center', },
  option: { alignItems: 'center', padding: 15, borderWidth: 1, borderRadius: 15 },
  text: { marginTop: 6, fontSize: 14, fontWeight: 'bold' },
  modalOverride: {
    margin: 0,
  },
});