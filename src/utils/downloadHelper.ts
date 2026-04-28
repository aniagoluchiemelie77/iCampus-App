import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

export const downloadFile = async (url: string, fileName: string) => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert('Permission Denied', 'You need to give storage permission to download files.');
      return;
    }
  }

  const { dirs } = ReactNativeBlobUtil.fs;
  const dirToSave = Platform.OS === 'ios' ? dirs.DocumentDir : dirs.DownloadDir;
  const configOptions = {
    fileCache: true,
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      path: `${dirToSave}/${fileName}`,
      description: 'Downloading file...',
    },
  };

  try {
    const res = await ReactNativeBlobUtil.config(configOptions).fetch('GET', url);
    if (Platform.OS === 'ios') {
      ReactNativeBlobUtil.ios.previewDocument(res.path());
    } else {
      Alert.alert('Success', 'File downloaded to your Downloads folder');
    }
  } catch (error) {
    console.error('Download error:', error);
    Alert.alert('Error', 'Could not download file.');
  }
};