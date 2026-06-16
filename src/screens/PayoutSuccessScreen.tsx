import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { CommonActions } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'PayoutSuccess'>;

export const PayoutSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { amount = 0, transactionId = 'N/A' } = route.params ?? {};
  useEffect(() => {
    const onBackPress = () => true;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, []);

  const navigateToWallet = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'ICashDashboard', params: { refresh: true } }],
      }),
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name="check-circle-outlined"
          size={64}
          color={colors.success}
        />

        <Text style={[styles.congrats, { color: colors.textDarker }]}>
          Payout Requested!
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>
          Amount Disbursed
        </Text>
        <CurrencyDisplay value={amount} size="large" isSuccess={true} />

        <Text style={[styles.details, { color: colors.text }]}>
          Ref: #{transactionId}
        </Text>

        <Text style={[styles.infoText, { color: colors.text }]}>
          Your payout has been successfully processed. It will reflect in your
          iCash balance shortly.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={navigateToWallet}
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Go to Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    padding: 15,
  },
  subContainer: {
    borderRadius: 15,
    alignContent: 'center',
    padding: 20,
  },
  congrats: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 15,
  },
  details: {
    fontSize: 12,
    marginBottom: 15,
  },
  infoText: {
    marginBottom: 30,
    fontSize: 14,
  },
  button: {
    width: '80%',
    borderRadius: 15,
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  backHome: {
    fontSize: 14,
    fontWeight: '600',
  },
});
