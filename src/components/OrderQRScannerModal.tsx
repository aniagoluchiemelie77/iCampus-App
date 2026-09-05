import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from '../assets/styles/colors';

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
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (isVisible && !hasPermission) {
      requestPermission();
    }
  }, [isVisible, hasPermission]);

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

  if (!hasPermission) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={false}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>
            Camera permission is required to scan QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: PRIMARY_COLOR }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtnStatic} onPress={onClose}>
            <MaterialIcons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!device) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={false}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Back camera device not found.</Text>
          <TouchableOpacity style={styles.closeBtnStatic} onPress={onClose}>
            <MaterialIcons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

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
        <View style={styles.overlay}>
          <View style={styles.maskTop} />
          <View style={styles.maskCenter}>
            <View style={styles.maskSide} />
            <View style={styles.scanFrame}>
              <Text style={styles.instruction}>
                {instructionText || 'Align Order QR within the frame'}
              </Text>
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskBottom} />
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionBtn: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskTop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  maskCenter: {
    flexDirection: 'row',
    height: 250, // Matches scan frame height
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  maskBottom: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  instruction: {
    color: '#FFF',
    position: 'absolute',
    bottom: -45,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: 300,
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  closeBtnStatic: { position: 'absolute', top: 50, right: 20, padding: 10 },
});
