import { useCallback } from 'react';
import { Alert } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import DocumentPicker, { types } from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';

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
      const result = await DocumentPicker.pickSingle({ type: [types.allFiles] });
      return { uri: result.uri, type: 'file' as const, name: result.name || 'document' };
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
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
  } catch (e) { return null; }
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
  const pickLessonVideo = useCallback(async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.video] });
      return { 
        uri: res.fileCopyUri || res.uri, 
        name: res.name, 
        type: res.type 
      };
    } catch (e) { return null; }
  }, []);
  const pickDigitalFile = useCallback(async () => {
    try {
      const response = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const targetUri = response.fileCopyUri || response.uri;
      const rawName = response.name || `digital-asset-${Date.now()}`;
      const extension = rawName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      const sizeInMB = parseFloat(((response.size || 0) / (1024 * 1024)).toFixed(2));

      return {
        uri: targetUri,
        fileName: rawName,
        fileFormat: extension,
        fileSizeInMB: sizeInMB,
      };
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Document picking exception:', err);
      }
      return null;
    }
  }, []);

  const pickCourseThumbnail = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      launchImageLibrary(
        { mediaType: 'photo', quality: 1 },
        (response) => {
          if (response.didCancel) {
            resolve(null);
          } else if (response.errorCode) {
            console.log('ImagePicker Error: ', response.errorMessage);
            resolve(null);
          } else {
            const uri = response.assets?.[0]?.uri;
            resolve(uri || null);
          }
        }
      );
    });
  }, []);

  return {pickCourseThumbnail,  pickImage, pickDocument, pickImageFromCamera, pickProductImages, pickLessonVideo, pickDigitalFile };
};