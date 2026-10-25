import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App.tsx';
import { useTheme } from '../context/ThemeContext';
import { CommonActions } from '@react-navigation/native';
import { CustomButton } from '../assets/components/AppUIComponents';
import { FloatingSuccessIcon } from '../components/EmptyFlatlistComponent';

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

  const navigateToHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home', params: { activeTab: 'home' } }],
      }),
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <FloatingSuccessIcon size={44} />
        <Text style={[styles.eyebrow, { color: colors.primary }]}>
          PAYOUT COMPLETE
        </Text>
        <Text style={[styles.congrats, { color: colors.textDarker }]}>
          Your payout is on its way
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>
          Amount disbursed
        </Text>
        <CurrencyDisplay value={amount} size="large" />
        <Text style={[styles.details, { color: colors.primary }]}>
          Reference #{transactionId}
        </Text>
        <Text style={[styles.infoText, { color: colors.text }]}>
          Your payout has been successfully processed.
        </Text>
        <CustomButton
          title="Back to Home"
          style={styles.button}
          onPress={navigateToHome}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    alignItems: 'center',
    padding: 25,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  congrats: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  details: {
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 14,
  },
  infoText: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
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
