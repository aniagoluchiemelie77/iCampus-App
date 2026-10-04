import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { CATEGORY_MAX_PRICES } from '../constants/inAppConstants';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import { useTheme } from '../context/ThemeContext';
import { DropOffStation } from '../types/firebase';
import { formatInputWithCommas } from '../utils/financeFormatter.ts';
interface VideoDurationExtractorProps {
  uri: string;
  onDurationExtracted: (duration: number) => void;
}
interface StepHeaderProps {
  number: number;
  title: string;
  currentStep: number;
  toggleStep: (step: number) => void;
}
interface PriceSectionProps {
  userCountry?: string;
  formInputs: CompleteFormInputs;
  setFormInputs: React.Dispatch<React.SetStateAction<CompleteFormInputs>>;
}
export interface CompleteFormInputs {
  title: string;
  description: string;
  price: string;
  niche: string;
  type: 'physical';
  amountInStock: string;
  physicalDetails: {
    weightKg: string;
    inStock: string;
    sellerGateways: ('drop_off' | 'home_delivery')[];
    dropOffAddress: DropOffStation[];
    colors: string[];
    sizes: string[];
  };
  mediaUrls: string[];
}

export function PriceSectionComponent({
  userCountry = 'Nigeria',
  formInputs,
  setFormInputs,
}: PriceSectionProps) {
  const { colors } = useTheme();
  const { exchangeData } = useExchangeRate(userCountry);
  const icashEntered = parseFloat(formInputs.price) || 0;
  const maxAllowedIcash = CATEGORY_MAX_PRICES[formInputs.type];
  const isOverpriced = icashEntered > maxAllowedIcash;

  return (
    <View style={{ marginVertical: 20 }}>
      <Text style={[styles.label, { color: colors.text }]}>Price </Text>
      <View
        style={[
          styles.disabledInputWrapper,
          isOverpriced && styles.inputWarning,
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.text }]}>
          {exchangeData.symbol}
        </Text>
        <TextInput
          style={[styles.disabledInput, { color: colors.text }]}
          value={formatInputWithCommas(formInputs.price)}
          onChangeText={text => {
            const rawValue = text.replace(/,/g, '');
            setFormInputs(prev => ({ ...prev, price: rawValue }));
          }}
          placeholderTextColor={colors.inputTextHolder}
          placeholder="0.00"
          keyboardType="numeric"
        />
      </View>
      {isOverpriced && (
        <Text style={[styles.warningText, { color: colors.primary }]}>
          This exceeds the maximum limit of {maxAllowedIcash} price allowed for
          a {formInputs.type}.
        </Text>
      )}
    </View>
  );
}
export const StepHeader = ({
  number,
  title,
  currentStep,
  toggleStep,
}: StepHeaderProps) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => toggleStep(number)}
      style={styles.stepHeader}
    >
      <View style={styles.headerLead}>
        <View
          style={[
            styles.stepBadge,
            currentStep === number && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.stepNumber,
              currentStep === number
                ? { color: colors.btnTextColor }
                : { color: colors.text },
            ]}
          >
            {number}
          </Text>
        </View>
        <Text
          style={[
            styles.stepTitle,
            currentStep === number
              ? { color: colors.textDarker, fontWeight: 'bold' }
              : { color: colors.text },
          ]}
        >
          {title}
        </Text>
      </View>
      <MaterialIcons
        name={
          currentStep === number ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
        }
        size={24}
        color={colors.text}
      />
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 15,
  },
  headerLead: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumber: { fontSize: 14, fontWeight: 'bold' },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 14,
    width: '100%',
    height: 50,
    marginBottom: 20,
  },
  disabledInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 8,
    width: '100%',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  disabledInput: {
    fontSize: 14,
    flex: 1,
  },
  currencyPrefix: {
    fontSize: 14,
    marginRight: 7,
  },
  spinner: {
    marginLeft: 7,
  },
  rateHint: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  inputWarning: { borderColor: PRIMARY_COLOR },
  warningText: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
});