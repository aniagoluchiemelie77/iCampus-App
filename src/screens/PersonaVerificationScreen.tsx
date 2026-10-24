import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Inquiry } from 'react-native-persona';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchInquiryFromBackend } from '../api/localPostApis';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import { CustomButton } from '../assets/components/AppUIComponents';

export const PersonaVerificationScreen = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.user) || {};
  const usertype = user?.usertype || 'otherUser';

  const handleStartVerification = async () => {
    setLoading(true);
    try {
      const { inquiryId } = await fetchInquiryFromBackend(usertype);
      if (!inquiryId) {
        setLoading(false);
        return;
      }
      Inquiry.fromInquiry(inquiryId)
        .onComplete((id, status, _fields) => {
          if (status === 'completed') {
            setLoading(false);
            Toast.show({
              type: 'success',
              text1: 'Verification Submitted!',
              text2: 'We are processing your ID. This usually takes a minute.',
            });
            navigation.navigate('ProfileScreen', { identifier: user?.uid });
          }
        })
        .onCanceled(() => {
          setLoading(false);
          Toast.show({
            type: 'error',
            text2: 'Verification cancelled.',
          });
        })
        .onError(error => {
          setLoading(false);
          Toast.show({
            type: 'error',
            text1: 'Verification Error',
            text2: 'Something went wrong. Please try again',
          });
          console.error('Persona Error:', error);
        })
        .build()
        .start();
    } catch (error) {
      setLoading(false);
      Toast.show({ type: 'error', text2: 'Could not start verification' });
      console.error('Failed to fetch inquiryId', error);
    }
  };
  const isEnterprise = user?.usertype === 'enterprise';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconWrap}>
          <MaterialIcons
            name={isEnterprise ? 'business' : 'verified-user'}
            size={72}
            color={PRIMARY_COLOR}
          />
        </View>
        <Text style={[styles.title, { color: colors.textDarker }]}>
          {isEnterprise ? 'Business Verification' : 'Verify Your Identity'}
        </Text>
        <Text style={[styles.description, { color: colors.text }]}>
          {isEnterprise
            ? 'To join iCampus as an organisation, we need to verify your business credentials. Please have your Tax ID and registration info ready.'
            : 'To keep iCampus safe, we use Persona to verify your identity. Please have a valid ID ready.'}
        </Text>

        <View style={styles.featureList}>
          <View style={[styles.featureItem, { borderColor: colors.primary }]}>
            <MaterialIcons
              name="check-circle"
              size={28}
              color={colors.primary}
            />
            <Text style={[styles.featureText, { color: colors.primary }]}>
              {isEnterprise ? 'Official Business Review' : 'Secure & Encrypted'}
            </Text>
          </View>
          <View style={[styles.featureItem, { borderColor: colors.primary }]}>
            <MaterialIcons
              name="check-circle"
              size={28}
              color={colors.primary}
            />
            <Text style={[styles.featureText, { color: colors.primary }]}>
              Takes less than 2 minutes
            </Text>
          </View>
        </View>
        <CustomButton
          title="Start Verification"
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={handleStartVerification}
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 20,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDF2E9',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    width: '100%',
  },
  featureList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    flex: 1,
    marginHorizontal: 6,
  },
  featureText: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
