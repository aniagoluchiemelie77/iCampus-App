import { Platform, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import type { ImageLibraryOptions } from 'react-native-image-picker';

export const selectImage = async (): Promise<string | null> => {
  const androidVersion =
    typeof Platform.Version === 'string'
      ? parseInt(Platform.Version, 10)
      : Platform.Version;

  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : androidVersion >= 33
      ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

  const result = await check(permission);

  if (result === RESULTS.BLOCKED) {
    Alert.alert(
      'Permission Required',
      'Photo access is blocked. Please enable it in the system settings to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => openSettings() },
      ],
    );
    return null;
  }

  if (result !== RESULTS.GRANTED) {
    const requestResult = await request(permission);
    if (requestResult !== RESULTS.GRANTED) {
      return null;
    }
  }

  const options: ImageLibraryOptions = {
    mediaType: 'photo',
    includeBase64: false,
    maxHeight: 800,
    maxWidth: 800,
    quality: 1,
  };

  return new Promise(resolve => {
    launchImageLibrary(options, response => {
      if (
        response.didCancel ||
        response.errorCode ||
        !response.assets?.[0]?.uri
      ) {
        resolve(null);
      } else {
        resolve(response.assets[0].uri);
      }
    });
  });
};
