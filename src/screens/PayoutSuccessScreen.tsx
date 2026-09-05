import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { CommonActions } from '@react-navigation/native';
import { CustomButton } from '../assets/components/AppUIComponents';

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
      <MaterialIcons
        name="check-circle-outline"
        size={100}
        color={colors.primary}
      />

      <Text style={[styles.congrats, { color: colors.textDarker }]}>
        Payout Completed!
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>
        Amount Disbursed
      </Text>
      <CurrencyDisplay value={amount} size="large" />

      <Text style={[styles.details, { color: colors.primary }]}>
        Ref: #{transactionId}
      </Text>

      <Text style={[styles.infoText, { color: colors.text }]}>
        Your payout has been successfully processed. It will reflect in your
        iCash balance shortly.
      </Text>
      <CustomButton
        title="Go to Wallet"
        style={styles.button}
        onPress={navigateToWallet}
        iconName="account-balace"
        iconColor={colors.btnTextColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    marginVertical: 20,
  },
  infoText: {
    marginBottom: 30,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
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
