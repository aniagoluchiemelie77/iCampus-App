import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Lecture } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { CustomButton } from '../assets/components/AppUIComponents';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onDismiss}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons name="sensors" size={60} color={colors.primary} />
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
              style={styles.reviewModalBtn2}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
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
    width: '90%',
    borderRadius: 25,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 25,
  },
  modalSubText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  reviewModalBtn: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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