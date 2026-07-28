import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Vibration } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
interface QRScannerComponentProps {
  handleScanSuccess: (value: string) => void;
  scannerVisible?: boolean;
}
export const QRScannerComponent = ({ 
  handleScanSuccess, 
  scannerVisible = true 
}: QRScannerComponentProps) => {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'code-128'],
    onCodeScanned: (codes) => {
      if (codes.length > 0) {
        const barcodeValue = codes[0].value;
        if (barcodeValue) {
          handleScanSuccess(barcodeValue);
          Vibration.vibrate(100);
        }
      }
    }
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
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={scannerVisible}
        codeScanner={codeScanner}
      />
      <View style={styles.scanFrame} />
    </>
  );
}

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
    borderColor: '#00FF00',
    borderRadius: 12,
  },
});