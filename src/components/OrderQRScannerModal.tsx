import React, { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface OrderScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  instructionText?: string;
}

export const OrderScannerModal = ({
  isVisible,
  onClose,
  onSuccess,
  instructionText,
}: OrderScannerProps) => {
  const cameraRef = useRef<any>(null);
  const device = useCameraDevice('back');
  const useCodeScanner = (params: any) =>
    (Camera as any).useCodeScanner
      ? (Camera as any).useCodeScanner(params)
      : params;
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: any[]) => {
      if (codes.length > 0 && codes[0].value) {
        onSuccess(codes[0].value);
      }
    },
  });
  if (!device) return null;
  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {React.createElement(Camera as any, {
          style: StyleSheet.absoluteFill,
          device: device,
          isActive: isVisible,
          codeScanner: codeScanner,
          ref: cameraRef,
        })}

        {/* Overlay UI */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instruction}>
            {instructionText || 'Align Order QR within the frame'}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialIcons name="close" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instruction: {
    color: '#FFF',
    marginTop: 40,
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10 },
});
