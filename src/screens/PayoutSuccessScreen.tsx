import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'PayoutSuccess'>;

export const PayoutSuccess = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { amount, transactionId } = route.params;

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
          size={60}
          color={colors.primary}
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
          Your payout has been successfully processed. It usually takes a few
          seconds to reflect in your iCash dashboard.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={() =>
            navigation.navigate('ICashDashboard', { refresh: true })
          }
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            Go to Wallet
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Home', {
              activeTab: 'home',
            })
          }
        >
          <Text style={[styles.backHome, { color: colors.primary }]}>
            Back to Home
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