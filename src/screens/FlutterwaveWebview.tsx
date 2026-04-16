import React, { useEffect, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler, Alert, TouchableOpacity } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { PRIMARY_COLOR } from '@components/Classroomcomponent';

const HeaderCloseButton = ({ onPress, color }: { onPress: () => void; color: string }) => (
  <TouchableOpacity onPress={onPress} style={{ marginLeft: 15 }}>
    <Icon name="close" size={28} color={color} />
  </TouchableOpacity>
);

const FlutterwaveWebview = ({ route, navigation }: any) => {
  const { url } = route.params;
  const isProcessing = useRef(true);

  // Memoize the callback so the reference stays the same
  const backAction = useCallback(() => {
    if (!isProcessing.current) return false;

    Alert.alert(
      "Discard Payment?",
      "Are you sure you want to cancel? Your transaction may not be completed.",
      [
        { text: "No, Stay", onPress: () => null, style: "cancel" },
        { text: "Yes, Cancel", onPress: () => navigation.goBack(), style: "destructive" }
      ]
    );
    return true;
  }, [navigation]);

  // Pass the stable component to navigation options
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderCloseButton onPress={backAction} color={PRIMARY_COLOR} />
      ),
    });
  }, [navigation, backAction]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [backAction]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url: currentUrl } = navState;

    if (currentUrl.includes('status=successful') || currentUrl.includes('tx_ref=')) {
      isProcessing.current = false;
      setTimeout(() => {
        navigation.navigate('SuccessScreen', { refresh: true });
      }, 1500);
    } 
    
    if (currentUrl.includes('status=cancelled') || currentUrl.includes('status=failed')) {
      navigation.goBack(); 
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default FlutterwaveWebview;