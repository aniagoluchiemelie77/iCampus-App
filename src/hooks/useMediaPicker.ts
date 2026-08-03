import { useCallback } from 'react';
import { Alert } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import Toast from 'react-native-toast-message';

export const useMediaPicker = () => {
  const pickImage = useCallback(async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 1200,
        height: 1200,
        cropping: true,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });
      return { uri: image.path, type: 'image' as const, name: 'image.jpg' };
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Toast.show({ type: 'error', text1: 'Media Error', text2: 'Could not select image.' });
      }
      return null;
    }
  }, []);

  const pickDocument = useCallback(async () => {
    try {
      const [result] = await pick({ type: [types.allFiles] });
      return { uri: result.uri, type: 'file' as const, name: result.name || 'document' };
    } catch (err: any) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        Toast.show({ type: 'error', text1: 'Document Error', text2: 'Selection failed.' });
      }
      return null;
    }
  }, []);

  const pickImageFromCamera = useCallback(async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 1200,
        height: 1200,
        cropping: true,
        mediaType: 'photo',
      });
      return { uri: image.path, type: 'image' as const, name: 'camera_photo.jpg' };
    } catch (e) { 
      return null; 
    }
  }, []);

  const pickProductImages = useCallback(async (maxLimit: number = 5) => {
    try {
      const selectedAssets = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: maxLimit,
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });

      return selectedAssets.map(asset => asset.path);
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        Alert.alert('Selection Error', 'Could not cleanly read selected images.');
      }
      return null;
    }
  }, []);


  const pickDigitalFile = useCallback(async () => {
    try {
      const [response] = await pick({
        type: [types.allFiles],
      });

      const targetUri = response.uri;
      const rawName = response.name || `digital-asset-${Date.now()}`;
      const extension = rawName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      const sizeInMB = parseFloat(((response.size || 0) / (1024 * 1024)).toFixed(2));

      return {
        uri: targetUri,
        fileName: rawName,
        fileFormat: extension,
        fileSizeInMB: sizeInMB,
      };
    } catch (err: any) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        console.error('Document picking exception:', err);
      }
      return null;
    }
  }, []);


  return { 
    pickImage, 
    pickDocument, 
    pickImageFromCamera, 
    pickProductImages, 
    pickDigitalFile 
  };
};