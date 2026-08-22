import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { Lecture } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';

interface OngoingLectureModalProps {
  lecture: Lecture | null;
  onDismiss: () => void;
  visible: boolean;
  onJoin: () => void;
}

export const OngoingLectureModal = ({
  visible,
  lecture,
  onJoin,
  onDismiss,
}: OngoingLectureModalProps) => {
  const { colors } = useTheme();
  if (!lecture) return null;
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
            {lecture?.topicName} - Live Lecture Ongoing!
          </Text>
          <Text style={[styles.modalSubText, { color: colors.text }]}>
            Your online class is currently live. Would you like to join now?
          </Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.reviewModalBtn, { borderColor: colors.primary }]}
            >
              <Text
                style={[styles.reviewModalBtnText, { color: colors.primary }]}
              >
                Not Now
              </Text>
            </TouchableOpacity>
            <CustomButton
              title="Join Class"
              onPress={onJoin}
              style={[
                styles.reviewModalBtn2,
                { backgroundColor: colors.btnColor },
              ]}
            />
          </View>
        </View>
      </Modal>
    </Portal>
  );
};
export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    borderRadius: 15,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalSubText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  reviewModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reviewModalBtn2: {
    paddingHorizontal: 15,
    width: 'auto',
  },
  reviewModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});