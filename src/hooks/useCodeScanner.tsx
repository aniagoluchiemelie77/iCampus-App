import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Vibration } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
// @ts-ignore
import { useCodeScanner } from 'react-native-vision-camera';
import { PRIMARY_COLOR } from '../assets/styles/colors';

interface QRScannerComponentProps {
  handleScanSuccess: (value: string) => void;
  scannerVisible?: boolean;
}

export const QRScannerComponent = ({
  handleScanSuccess,
  scannerVisible = true,
}: QRScannerComponentProps) => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    (async () => {
      if (!hasPermission) {
        await requestPermission();
      }
    })();
  }, [hasPermission, requestPermission]);

  // @ts-ignore - Bypass strict IDE type check if definitions are out of sync
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128'],
    onCodeScanned: (codes: any[]) => {
      if (codes.length > 0) {
        const barcodeValue = codes[0].value;
        if (barcodeValue) {
          handleScanSuccess(barcodeValue);
          Vibration.vibrate(100);
        }
      }
    },
  });

  if (!device || !hasPermission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: 'white' }}>
          {hasPermission ? 'Initializing Camera...' : 'No Camera Access'}
        </Text>
      </View>
    );
  }

  return (
    <>
      {(Camera as any)({
        style: StyleSheet.absoluteFill,
        device: device,
        isActive: scannerVisible,
        codeScanner: codeScanner,
      })}
      <View style={styles.scanFrame} />
    </>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  scanFrame: {
    position: 'absolute',
    alignSelf: 'center',
    top: '30%',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
  },
});
