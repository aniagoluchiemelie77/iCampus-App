import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import {
  CATEGORY_MAX_PRICES,
  USD_EQUIVALENCE_OF_1_ICASH,
} from '../constants/inAppConstants';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import { useTheme } from '../context/ThemeContext';
import {
  DropOffStation,
  Product
} from '../types/firebase';

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
export type UIContentItem = NonNullable<
  Product['courseDetails']
>['content'][number] & {
  isUploading?: boolean;
  verificationStatus?:
    | 'Approved'
    | 'Pending Review'
    | 'Flagged/Rejected'
    | 'Failed';
};
export interface CompleteFormInputs {
  title: string;
  description: string;
  price: string;
  niche: string;
  productType: 'physical' | 'file' | 'course';
  physicalDetails: {
    weightKg: string;
    inStock: string;
    sellerGateways: ('drop_off' | 'home_delivery')[];
    dropOffAddress: DropOffStation[];
    colors: string[];
    sizes: string[];
  };
  courseDetails: {
    additionalLecturersRaw: string;
    content: UIContentItem[];
  };
  fileDetails: {
    fileName: string;
    fileSizeInMB: number;
    fileFormat: string;
    fileUrl: string;
    isUploading: boolean;
    rawBlobOrFile?: any;
  };
  lessons: {
    title: string;
    videoUrl: string;
    duration: number;
    isFreePreview: boolean;
  }[];
  mediaUrls: string[];
}

export const VideoDurationExtractor = ({
  uri,
  onDurationExtracted,
}: VideoDurationExtractorProps) => {
  return (
    <Video
      source={{ uri }}
      paused={true}
      mixWithOthers="mix"
      style={{ width: 0, height: 0, position: 'absolute' }}
      onLoad={meta => {
        if (meta && meta.duration) {
          onDurationExtracted(Math.round(meta.duration));
        }
      }}
      onError={err => console.log('Metadata extraction failed:', err)}
    />
  );
};
export function PriceSectionComponent({
  userCountry = 'Nigeria',
  formInputs,
  setFormInputs,
}: PriceSectionProps) {
  const { colors } = useTheme();
  const {exchangeData, loading} = useExchangeRate(userCountry);

  const localRatePerIcash = exchangeData.rate * USD_EQUIVALENCE_OF_1_ICASH;
  const icashEntered = parseFloat(formInputs.price) || 0;
  const maxAllowedIcash = CATEGORY_MAX_PRICES[formInputs.productType];
  const isOverpriced = icashEntered > maxAllowedIcash;

  const rawConvertedAmount = icashEntered * localRatePerIcash;

  const formattedLocalCurrency = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rawConvertedAmount);

  return (
    <>
      <Text style={[styles.label, { color: colors.text }]}>Price (iCash)</Text>
      <TextInput
        style={[
          styles.input,
          isOverpriced && styles.inputWarning,
          { color: colors.text },
        ]}
        placeholder="0.00"
        keyboardType="numeric"
        value={formInputs.price}
        onChangeText={text => setFormInputs(prev => ({ ...prev, price: text }))}
        placeholderTextColor={colors.inputTextHolder}
      />
      {isOverpriced && (
        <Text style={[styles.warningText, { color: colors.primary }]}>
          This exceeds the maximum limit of {maxAllowedIcash} iCash allowed for
          a {formInputs.productType}.
        </Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>
        Estimated Local Value ({exchangeData.code})
      </Text>
      <View style={styles.disabledInputWrapper}>
        <Text style={[styles.currencyPrefix, { color: colors.text }]}>
          {exchangeData.symbol}
        </Text>
        <TextInput
          style={[styles.disabledInput, { color: colors.text }]}
          value={formInputs.price ? formattedLocalCurrency : '0.00'}
          editable={false}
          selectTextOnFocus={false}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
        )}
      </View>
      <Text style={[styles.rateHint, { color: colors.primaryTint }]}>
        Rate anchored at 1 iCash = {exchangeData.symbol}
        {(exchangeData.rate * USD_EQUIVALENCE_OF_1_ICASH).toFixed(2)}{' '}
        {exchangeData.code}
      </Text>
    </>
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
  },
  headerLead: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    alignContent: 'center',
    marginRight: 10,
  },
  stepNumber: { fontSize: 14, fontWeight: 'bold' },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    width: '100%',
    marginBottom: 15,
  },
  disabledInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 8,
    width: '100%',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 15,
  },
  disabledInput: {
    fontSize: 14,
    flex: 1,
  },
  currencyPrefix: {
    fontSize: 14,
  },
  spinner: {
    marginLeft: 4,
  },
  rateHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputWarning: { borderColor: PRIMARY_COLOR },
  warningText: {
    fontSize: 11,
    marginTop: -8,
    marginBottom: 12,
    fontWeight: '500',
  },
});