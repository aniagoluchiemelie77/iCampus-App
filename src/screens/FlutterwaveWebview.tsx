import React, { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const HeaderCloseButton = ({
  onPress,
  color,
}: {
  onPress: () => void;
  color: string;
}) => (
  <TouchableOpacity onPress={onPress} style={{ marginLeft: 15 }}>
    <MaterialIcons name="close-outlined" size={28} color={color} />
  </TouchableOpacity>
);

const FlutterwaveWebview = ({ route, navigation }: any) => {
  const { colors } = useTheme();
  const { url } = route.params;
  const isProcessing = useRef(true);

  const backAction = useCallback(() => {
    if (!isProcessing.current) return false;

    Alert.alert(
      'Discard Payment?',
      'Are you sure you want to cancel? Your transaction may not be completed.',
      [
        { text: 'No, Stay', onPress: () => null, style: 'cancel' },
        {
          text: 'Yes, Cancel',
          onPress: () => navigation.goBack(),
          style: 'destructive',
        },
      ],
    );
    return true;
  }, [navigation]);
  const renderHeaderLeft = useCallback(
    () => <HeaderCloseButton onPress={backAction} color={colors.primary} />,
    [backAction, colors],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderHeaderLeft,
    });
  }, [navigation, renderHeaderLeft]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );
    return () => backHandler.remove();
  }, [backAction]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url: currentUrl } = navState;

    if (
      currentUrl.includes('status=successful') ||
      currentUrl.includes('tx_ref=')
    ) {
      isProcessing.current = false;
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'ICashDashboard',
              params: {
                refresh: true,
              },
            },
          ],
        });
      }, 1500);
    }
    if (
      currentUrl.includes('status=cancelled') ||
      currentUrl.includes('status=failed')
    ) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebView
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View
            style={[
              styles.loader,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
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
  container: { flex: 1, paddingHorizontal: 15 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignContent: 'center',
    flex: 1,
  },
});

export default FlutterwaveWebview;
