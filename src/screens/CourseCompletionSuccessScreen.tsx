import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RNBlobUtil from 'react-native-blob-util';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export interface CertificateScreenParams {
  certificateUrl: string;
  certificateId: string;
  details: {
    courseTitle: string;
  };
}
export const CertificateScreen = ({
  route,
}: {
  route: { params: CertificateScreenParams };
}) => {
  const { colors } = useTheme();
  const { certificateUrl, certificateId, details } = route.params;
  const navigation = useNavigation<any>();

  // Memoized Download Trigger with Platform Agnostic Storage Paths
  const handleDownload = useCallback(async () => {
    const { dirs } = RNBlobUtil.fs;
    const isAndroid = Platform.OS === 'android';

    // Choose destination dynamically based on OS platform layers
    const baseDir = isAndroid ? dirs.DownloadDir : dirs.DocumentDir;
    const path = `${baseDir}/iCampus_Cert_${certificateId}.pdf`;

    try {
      const configOptions = isAndroid
        ? {
            fileCache: true,
            addAndroidDownloads: {
              useDownloadManager: true,
              notification: true,
              path: path,
              description: 'Downloading your iCampus Certificate',
              mime: 'application/pdf',
            },
          }
        : {
            fileCache: true,
            path: path,
          };

      const res = await RNBlobUtil.config(configOptions).fetch(
        'GET',
        certificateUrl,
      );

      if (Platform.OS === 'ios') {
        // Since iOS saves to documents app sandbox, trigger native preview utility for the user
        RNBlobUtil.ios.previewDocument(res.path());
      } else {
        Alert.alert('Success', 'Certificate saved to your Downloads folder!');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Could not download file. Check your internet connection.',
      );
    }
  }, [certificateId, certificateUrl]);

  // Memoized System Native Share Integration
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I just completed "${details.courseTitle}" on iCampus! Check out my certificate: ${certificateUrl}`,
        url: certificateUrl,
      });
    } catch (error) {
      console.error('Share action encountered an exception: ', error);
    }
  }, [details.courseTitle, certificateUrl]);

  // Memoized Home Tab Reset Routing Handler
  const handleGoHome = useCallback(() => {
    navigation.navigate('Home', { activeTab: 'home' });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        source={{
          uri:
            Platform.OS === 'android'
              ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                  certificateUrl,
                )}`
              : certificateUrl,
        }}
        style={styles.fullWebview}
        scalesPageToFit={true}
        startInLoadingState={true}
        backgroundColor={colors.backgroundSecondary}
      />

      <SafeAreaView
        style={[
          styles.floatingActionContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.glassBar}>
          <TouchableOpacity style={styles.iconButton} onPress={handleGoHome}>
            <MaterialIcons
              name="home-outlined"
              size={26}
              color={colors.primary}
            />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
            <MaterialIcons name="share" size={26} color={colors.primary} />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleDownload}>
            <MaterialIcons
              name="file-download-outlined"
              size={26}
              color={colors.primary}
            />
            <Text style={[styles.buttonText, { color: colors.text }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    paddingHorizontal: 15,
    position: 'relative',
  },
  fullWebview: {
    flex: 1,
    padding: 15,
    borderRadius: 15,
  },
  floatingActionContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  glassBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 40,
    gap: 30,
    alignItems: 'center',
    elevation: 8,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconButton: {
    alignContent: 'center',
  },
  buttonText: {
    fontSize: 12,
    marginTop: 5,
  },
});
