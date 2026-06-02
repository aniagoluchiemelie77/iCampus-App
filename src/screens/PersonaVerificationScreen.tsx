import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Inquiry } from 'react-native-persona';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchInquiryFromBackend } from '../api/localPostApis';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';

export const PersonaVerificationScreen = () => {
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
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={isEnterprise ? 'business' : 'verified-user'}
            size={80}
            color={PRIMARY_COLOR}
          />
        </View>
        <Text style={styles.title}>
          {isEnterprise ? 'Business Verification' : 'Verify Your Identity'}
        </Text>
        <Text style={styles.description}>
          {isEnterprise
            ? 'To join iCampus as an organisation, we need to verify your business credentials. Please have your Tax ID and registration info ready.'
            : 'To keep iCampus safe, we use Persona to verify your identity. Please have a valid ID ready.'}
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.featureText}>
              {isEnterprise ? 'Official Business Review' : 'Secure & Encrypted'}
            </Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.featureText}>Takes less than 2 minutes</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleStartVerification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Start Verification</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    alignContent: 'center',
  },
  content: { alignItems: 'center' },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
  },
  featureList: {
    marginTop: 15,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureItem: { alignItems: 'center', padding: 10 },
  featureText: { marginTop: 6, fontSize: 14, color: PRIMARY_COLOR_TINT },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
