import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import { useAppDataContext } from '../components/EventContext';
import Modal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';

const POPULAR_REASONS = [
  'Changed my mind',
  'Seller is unresponsive',
  'Incorrect delivery station',
  'Found a better price',
  'Accidental purchase',
];
interface OrderCancelModalProps {
  isVisible: boolean;
  onClose: () => void;
  orderId: string;
}

export const CancellationModal = ({
  isVisible,
  orderId,
  onClose,
}: OrderCancelModalProps) => {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const { handleCancelOrder } = useAppDataContext();
  const [isCancelling, setIsCancelling] = useState(false);
  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    await handleCancelOrder(orderId, reason);
    setIsCancelling(false);
  };
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={() => onClose()}
      swipeDirection="down"
      onSwipeComplete={() => onClose()}
    >
      <View style={modalStyles.overlay}>
        <View
          style={[
            modalStyles.content,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[modalStyles.title, { color: colors.textDarker }]}>
            Cancel Order?
          </Text>
          <Text style={[modalStyles.subtitle, { color: colors.text }]}>
            Please let us know why you're cancelling.
          </Text>
          <View style={modalStyles.chipContainer}>
            {POPULAR_REASONS.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  modalStyles.chip,
                  reason === item
                    ? modalStyles.activeChip
                    : {
                        borderColor: colors.primaryTint,
                      },
                ]}
                onPress={() => setReason(item)}
              >
                <Text
                  style={[
                    modalStyles.chipText,
                    reason === item
                      ? modalStyles.activeChipText
                      : {
                          color: colors.primary,
                        },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[
              modalStyles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Or type a custom reason..."
            value={reason}
            onChangeText={setReason}
            multiline
            placeholderTextColor={colors.inputTextHolder}
          />
          <View style={modalStyles.buttonRow}>
            <TouchableOpacity
              style={[modalStyles.backButton, { borderColor: colors.primary }]}
              onPress={onClose}
            >
              <Text
                style={[modalStyles.backButtonText, { color: colors.primary }]}
              >
                Go Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.confirmButton,
                !reason && { opacity: 0.5 },
                { backgroundColor: colors.btnColor },
              ]}
              onPress={handleConfirmCancel}
              disabled={!reason || isCancelling}
            >
              <Text
                style={[
                  modalStyles.confirmButtonText,
                  { color: colors.btnTextColor },
                ]}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    borderRadius: 25,
    padding: 20,
    elevation: 5,
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginBottom: 15, width: '100%' },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.8,
  },
  activeChip: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR_TINT,
  },
  chipText: { fontSize: 12 },
  activeChipText: { color: '#fff' },
  input: {
    borderWidth: 0.8,
    borderRadius: 8,
    padding: 10,
    height: 100,
    width: '100%',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    alignItems: 'center',
    borderWidth: 0.8,
  },
  backButtonText: { fontSize: 14, fontWeight: '600' },
  confirmButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: { fontSize: 14, fontWeight: 'bold' },
});