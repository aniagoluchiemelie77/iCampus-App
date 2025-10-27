import React, { useEffect, useState } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import SweetAlertModal from '../components/alertscomponent';
import { EmailVerifyScreenStyles } from '../assets/styles/colors';

const VerifyEmail = () => {
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { email, verified } = route.params as {
    email?: string;
    verified?: string;
  };

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning'>(
    'success',
  );
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (!email) {
      console.warn('❌ No email provided. Skipping verification polling.');
      setMessage('❌ No email provided.');
      setLoading(false);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://10.0.2.2:5000/users/status?email=${email}`,
        );

        if (response.data.isVerified) {
          clearInterval(interval);
          setAlertType('success');
          setAlertMessage('✅ Verification successful. Redirecting to Home...');
          setMessage(
            '✅ Your email has been verified! You can now log in and start using iCampus.',
          );
          setAlertVisible(true);

          setTimeout(() => {
            navigation.navigate('Home');
          }, 4000);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [email, navigation]);

  return (
    <View style={EmailVerifyScreenStyles.bkg}>
      <View style={EmailVerifyScreenStyles.container}>
        <Text style={EmailVerifyScreenStyles.infoText}>
          {loading
            ? 'Verification Link sent, please check your email'
            : message}
        </Text>
        <Text style={EmailVerifyScreenStyles.infoText}>
          {loading ? '⏳ Verifying your account...' : message}
        </Text>

        {!loading && (
          <>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(verified === 'true' ? 'SignUp' : 'Home')
              }
            >
              <Text>
                {verified === 'true' ? 'Go to Signup' : 'Back to Home'}
              </Text>
            </TouchableOpacity>

            <SweetAlertModal
              visible={alertVisible}
              onConfirm={() => setAlertVisible(false)}
              title={
                alertType === 'success'
                  ? 'Success!'
                  : alertType === 'error'
                  ? 'Oops!'
                  : alertType === 'warning'
                  ? 'Warning!'
                  : 'Notice'
              }
              message={alertMessage}
              type={alertType}
            />
          </>
        )}
      </View>
    </View>
  );
};


export default VerifyEmail;
