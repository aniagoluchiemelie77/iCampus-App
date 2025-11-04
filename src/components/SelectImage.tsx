import { Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import type { ImageLibraryOptions } from 'react-native-image-picker';

export const selectImage = async (): Promise<string | null> => {
  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;

  const result = await check(permission);

  if (result === RESULTS.GRANTED || (await request(permission)) === RESULTS.GRANTED) {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 1,
    };

    return new Promise((resolve) => {
      launchImageLibrary(options, (response) => {
        if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) {
          resolve(null);
        } else {
          resolve(response.assets[0].uri);
        }
      });
    });
  } else {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 1,
    };
    Toast.show({
      type: 'error',
      text1: 'Permission denied. Please enable photo library access in settings.',
      position: 'bottom',
      bottomOffset: 10,
    });

    return new Promise((resolve) => {
      launchImageLibrary(options, (response) => {
        if (response.didCancel || response.errorCode || !response.assets?.[0]?.uri) {
          resolve(null);
        } else {
          resolve(response.assets[0].uri);
        }
      });
    });
  }
};
