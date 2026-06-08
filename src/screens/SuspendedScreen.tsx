import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { getUserAccountState } from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = StackScreenProps<RootStackParamList, 'SuspendedScreen'>;

export const SuspendedScreen = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { reason } = route.params;
  const [checking, setChecking] = useState(false);
  const handleContactSupport = () => {
    Linking.openURL(
      'mailto:support@icampus.edu.ng?subject=iCash Account Suspension',
    );
  };
  const checkAccountStatus = async () => {
    setChecking(true);
    try {
      const result = await getUserAccountState();
      if (result.success && result.user && !result.user.isSuspended) {
        navigation.replace('Home', { activeTab: 'home' });
      } else if (result.user?.isSuspended) {
        console.warn('User account is suspended.');
      } else {
        console.error('Authentication failed:', result.error);
      }
    } catch (err) {
      console.log('Still suspended or network error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons name="info-outlined" size={60} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          Account Restricted
        </Text>
        <Text style={[styles.reasonText, { color: colors.text }]}>
          {reason || 'Security protocol triggered.'}
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Your iCampus account has been restricted. This usually happens after
          multiple failed iCash PIN attempts or suspicious activity. You cannot
          access services until this is resolved.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.btnColor }]}
          onPress={checkAccountStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color={colors.btnTextColor} size="small" />
          ) : (
            <Text
              style={[styles.primaryBtnText, { color: colors.btnTextColor }]}
            >
              Refresh Account Status
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.supportLink}
          onPress={handleContactSupport}
        >
          <MaterialIcons
            name="email-outlined"
            size={20}
            color={colors.primary}
          />
          <Text style={[styles.supportLinkText, { color: colors.primary }]}>
            Contact iCampus Security
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, alignContent: 'center' },
  subContainer: { borderRadius: 15, padding: 20, alignContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginVertical: 20 },
  reasonText: { fontSize: 14, fontWeight: '600', marginBottom: 15 },
  infoText: { fontSize: 14, marginBottom: 20 },
  primaryBtn: {
    width: '80%',
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
  },
  primaryBtnText: { fontWeight: 'bold', fontSize: 14 },
  supportLink: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportLinkText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});