import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useTheme } from '../context/ThemeContext';

interface ImageConfirmationModalProps {
  isVisible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: () => void;
  isUploading: boolean;
  /** Re-opens the picker so the user can swap the photo before uploading. */
  onChangeImage?: () => void;
  title?: string;
  subtitle?: string;
  confirmText?: string;
}

/** Card width cap, so it never stretches on tablets or desktop browsers. */
const CARD_MAX_WIDTH = 420;

export const ImageConfirmationModal = ({
  isVisible,
  imageUri,
  onClose,
  onConfirm,
  isUploading,
  onChangeImage,
  title = 'Update profile photo',
  subtitle = 'This photo will be visible to everyone who visits your profile.',
  confirmText = 'Use this photo',
}: ImageConfirmationModalProps) => {
  const { colors } = useTheme();
  const close = () => {
    if (!isUploading) onClose();
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={close}
      onBackButtonPress={close}
      backdropOpacity={0.55}
      animationIn="zoomIn"
      animationOut="zoomOut"
      animationInTiming={220}
      animationOutTiming={180}
      backdropTransitionOutTiming={0}
      useNativeDriverForBackdrop
      style={styles.modal}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border + '33' },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialIcons name="add-a-photo" size={20} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            onPress={close}
            disabled={isUploading}
            hitSlop={10}
            style={[styles.closeBtn, isUploading && styles.dimmed]}
            accessibilityLabel="Close"
          >
            <MaterialIcons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.preview, { backgroundColor: colors.background }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <MaterialIcons name="image" size={48} color={colors.primary} />
          )}
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.uploadingText}>Uploading…</Text>
            </View>
          )}
          {!!onChangeImage && !isUploading && (
            <TouchableOpacity
              onPress={onChangeImage}
              style={styles.changeBtn}
              accessibilityLabel="Choose a different photo"
            >
              <MaterialIcons name="photo-library" size={15} color="#fff" />
              <Text style={styles.changeText}>Choose another</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }, isUploading && styles.dimmed]}
            onPress={close}
            disabled={isUploading}
          >
            <Text style={[styles.cancelText, { color: colors.textDarker }]}>Cancel</Text>
          </TouchableOpacity>
          <CustomButton
            title={confirmText}
            onPress={onConfirm}
            isLoading={isUploading}
            disabled={isUploading || !imageUri}
            style={styles.confirmButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modal: { alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 2, opacity: 0.75 },
  closeBtn: { padding: 2 },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  changeBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  changeText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
  confirmButton: { flex: 1, width: 'auto', height: 48, borderRadius: 12 },
  dimmed: { opacity: 0.5 },
});
