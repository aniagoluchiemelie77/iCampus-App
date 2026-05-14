import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { WebView } from 'react-native-webview'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import RNBlobUtil from 'react-native-blob-util'; 
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const CertificateScreen = ({ route }: {route: any}) => {
    const { certificateUrl, certificateId, details } = route.params;
    const navigation = useNavigation<any>();

    const handleDownload = async () => {
        const { dirs } = RNBlobUtil.fs;
        const path = `${dirs.DownloadDir}/iCampus_Cert_${certificateId}.pdf`;
        try {
            await RNBlobUtil.config({
                fileCache: true,
                addAndroidDownloads: {
                    useDownloadManager: true,
                    notification: true,
                    path: path,
                    description: 'Downloading your iCampus Certificate',
                    mime: 'application/pdf',
                },
            }).fetch('GET', certificateUrl);      
            Alert.alert("Success", "Certificate saved to your Downloads folder!");
        } catch (error) {
            Alert.alert("Error", "Could not download file. Check your internet connection.");
        }
    };
    const handleShare = async () => {
        try {
            await Share.share({
                message: `I just completed "${details.courseTitle}" on iCampus! Check out my certificate: ${certificateUrl}`,
                url: certificateUrl, 
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            <WebView
                source={{ uri: certificateUrl }}
                style={styles.fullWebview}
                scalesPageToFit={true}
                startInLoadingState={true}
                backgroundColor="#ffffff" 
            />
            <SafeAreaView style={styles.floatingActionContainer}>
                <View style={styles.glassBar}>          
                    <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={() => navigation.navigate('Home', { activeTab: 'home' })}
                    >
                        <MaterialIcons name="home-outlined" size={26} color={PRIMARY_COLOR} />
                        <Text style={styles.buttonText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <MaterialIcons name="share" size={26} color={PRIMARY_COLOR} />
                        <Text style={styles.buttonText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={handleDownload}
                    >
                        <MaterialIcons name="file-download-outlined" size={26} color={PRIMARY_COLOR} />
                        <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignContent: 'center',
    position: 'relative'
  },
  fullWebview: {
    flex: 1,
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
    backgroundColor: 'rgba(26, 26, 26, 0.95)', 
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
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  iconButton: {
    alignContent: 'center',
  },
  buttonText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Inter-Medium',
  },
});