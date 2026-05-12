import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import {PRIMARY_COLOR, PRIMARY_COLOR_TINT} from '../assets/styles/colors';
import { useAppDataContext } from '../components/EventContext';
import Modal from 'react-native-modal';

const POPULAR_REASONS = [
    "Changed my mind",
    "Seller is unresponsive",
    "Incorrect delivery station",
    "Found a better price",
    "Accidental purchase"
];
interface OrderCancelModalProps {
    isVisible: boolean;
    onClose: () => void;
    orderId: string;
}

export const CancellationModal = ({ isVisible, orderId, onClose }: OrderCancelModalProps) => {
    const [reason, setReason] = useState("");
    const { handleCancelOrder} = useAppDataContext();
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
                <View style={modalStyles.content}>
                    <Text style={modalStyles.title}>Cancel Order?</Text>
                    <Text style={modalStyles.subtitle}>Please let us know why you're cancelling.</Text>
                    <View style={modalStyles.chipContainer}>
                        {POPULAR_REASONS.map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[modalStyles.chip, reason === item && modalStyles.activeChip]}
                                onPress={() => setReason(item)}
                            >
                                <Text style={[modalStyles.chipText, reason === item && modalStyles.activeChipText]}>
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={modalStyles.input}
                        placeholder="Or type a custom reason..."
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        placeholderTextColor={PRIMARY_COLOR_TINT}
                    />
                    <View style={modalStyles.buttonRow}>
                        <TouchableOpacity style={modalStyles.backButton} onPress={onClose}>
                            <Text style={modalStyles.backButtonText}>Go Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[modalStyles.confirmButton, !reason && { opacity: 0.5 }]} 
                            onPress={handleConfirmCancel}
                            disabled={!reason || isCancelling}
                        >
                            <Text style={modalStyles.confirmButtonText}>
                                {isCancelling ? "Processing..." : "Confirm Cancel"}
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
    alignItems: 'center'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    elevation: 5,
    alignItems: 'center'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: PRIMARY_COLOR },
  subtitle: { fontSize: 14, color: PRIMARY_COLOR_TINT, marginBottom: 15, width: '100%'},
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
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  activeChip: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: { fontSize: 12, color: PRIMARY_COLOR },
  activeChipText: { color: '#fff' },
  input: {
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 10,
    height: 100,
    width: '100%',
    textAlignVertical: 'top',
    backgroundColor: '#fadccc',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: { flex: 1, padding: 15, alignItems: 'center',  borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT},
  backButtonText: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '600' },
  confirmButton: {
    flex: 2,
    backgroundColor: PRIMARY_COLOR,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});