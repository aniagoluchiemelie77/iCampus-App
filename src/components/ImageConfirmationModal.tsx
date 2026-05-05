import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Modal from 'react-native-modal';
import { PRIMARY_COLOR } from '../assets/styles/colors';

interface ImageConfirmationModalProps {
  isVisible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: () => void;
  isUploading: boolean;
}

export const ImageConfirmationModal = ({
  isVisible,
  imageUri,
  onClose,
  onConfirm,
  isUploading,
}: ImageConfirmationModalProps) => {
  return (
    <Modal 
        isVisible={isVisible}
        onBackdropPress={() => onClose()}
        swipeDirection="down"
        onSwipeComplete={() => onClose()}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.popupCenter}>
          <View style={styles.topHeader}>
            <Text style={styles.modalTitle}>
              Confirm Profile Photo
            </Text>
          </View>

          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.modalImage}
            />
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              disabled={isUploading}
            >
              <Text style={styles.buttonText}>
                {isUploading ? 'Uploading...' : 'Confirm'}
              </Text>
            </TouchableOpacity>

            
          </View>
        </View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
  popupCenter: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 5,
    alignItems: 'center',
  },
    topHeader: {
    marginBottom: 15,
    alignContent: 'center',
  },
    modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#222'
  },
    modalImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
    marginBottom: 15,
    alignSelf: 'center',
    resizeMode: 'cover',
  },
   modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
   confirmButton: {
      backgroundColor: PRIMARY_COLOR,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 15,
      alignContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    cancelText: {
        color: PRIMARY_COLOR,
        fontSize: 14,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#fadccc',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        alignContent: 'center',
    },
});