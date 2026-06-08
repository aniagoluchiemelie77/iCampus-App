import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Inquiry } from 'react-native-persona';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchInquiryFromBackend } from '../api/localPostApis';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { useTheme } from '../context/ThemeContext';

export const PersonaVerificationScreen = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.user);
  const usertype = user?.usertype || 'otherUser';

  const handleStartVerification = async () => {
    try {
      const { inquiryId } = await fetchInquiryFromBackend(usertype);
      if (!inquiryId) return;
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
            // dispatch(fetchUserProfile());
          }
        })
        .onCanceled(() => {
          console.log('User exited');
        })
        .onError(error => {
          console.error('Persona Error:', error);
        })
        .build()
        .start();
    } catch (error) {
      console.error('Failed to fetch inquiryId', error);
    }
  };
  const isEnterprise = user?.usertype === 'enterprise';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={isEnterprise ? 'business-outlined' : 'verified-user-outlined'}
          size={60}
          color={colors.primary}
        />
        <Text style={[styles.title, {color: colors.textDarker}]}>
          {isEnterprise ? 'Business Verification' : 'Verify Your Identity'}
        </Text>
        <Text style={[styles.description, {color: colors.text}]}>
          {isEnterprise
            ? 'To join iCampus as an organisation, we need to verify your business credentials. Please have your Tax ID and registration info ready.'
            : 'To keep iCampus safe, we use Persona to verify your identity. Please have a valid ID ready.'}
        </Text>

        <View style={styles.featureList}>
          <View style={[styles.featureItem, {borderColor: colors.primary}]}>
            <MaterialIcons
              name="check-circle-outlined"
              size={30}
              color={colors.primary}
            />
            <Text style={[styles.featureText, {color: colors.primary}]}>
              {isEnterprise ? 'Official Business Review' : 'Secure & Encrypted'}
            </Text>
          </View>
          <View style={[styles.featureItem, {borderColor: colors.primary}]}>
            <MaterialIcons
              name="check-circle-outlined"
              size={30}
              color={colors.primary}
            />
            <Text style={[styles.featureText, {color: colors.primary}]}>Takes less than 2 minutes</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: colors.btnColor}]}
          onPress={handleStartVerification}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.btnTextColor} size={'small'} />
          ) : (
            <Text style={[styles.buttonText, {color: colors.btnTextColor}]}>Start Verification</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    alignContent: 'center',
  },
  subContainer: {
    alignContent: 'center',
    padding: 20,
    borderRadius: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  description: {
    fontSize: 14,
    marginBottom: 15
  },
  featureList: {
    marginBottom: 15,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  featureItem: { alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 15 },
  featureText: { marginTop: 6, fontSize: 14, },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
});
