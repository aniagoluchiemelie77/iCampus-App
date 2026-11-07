import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  PanResponder,
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
    /** How far from the seller buyers can be. null = anywhere. */
    salesRadiusKm: number | null;
  };
  mediaUrls: string[];
}

/** Which variant pickers make sense for each niche. */
export interface NicheVariantRules {
  colors: boolean;
  sizes: boolean;
  sizeLabel?: string;
  sizePlaceholder?: string;
}
const NO_VARIANTS: NicheVariantRules = { colors: false, sizes: false };
export const NICHE_VARIANTS: Record<string, NicheVariantRules> = {
  Electronics: { colors: true, sizes: false },
  Fashion: { colors: true, sizes: true },
  Footwears: {
    colors: true,
    sizes: true,
    sizePlaceholder: 'e.g. 40, 42, 44, UK 9',
  },
  Stationery: { colors: true, sizes: false },
  'Health & Beauty': {
    colors: false,
    sizes: true,
    sizeLabel: 'Available Sizes / Volumes (Optional)',
    sizePlaceholder: 'e.g. 50ml, 100ml, 250g',
  },
  'Snacks and Deserts': NO_VARIANTS,
  Food: NO_VARIANTS,
};
export const variantRulesFor = (niche?: string): NicheVariantRules =>
  (niche && NICHE_VARIANTS[niche]) || NO_VARIANTS;

// ---------------------------------------------------------------------------
// Sales radius slider (Tinder-style "maximum distance")
// ---------------------------------------------------------------------------
export const SALES_RADIUS_MIN_KM = 1;
export const SALES_RADIUS_MAX_KM = 100;
// One stop past the max means "Anywhere".
const ANYWHERE_STOP = SALES_RADIUS_MAX_KM + 1;
const STOP_SPAN = ANYWHERE_STOP - SALES_RADIUS_MIN_KM;
const THUMB_SIZE = 26;

const stopFor = (km: number | null) =>
  km == null
    ? ANYWHERE_STOP
    : Math.min(Math.max(km, SALES_RADIUS_MIN_KM), SALES_RADIUS_MAX_KM);
const kmForStop = (stop: number) => (stop >= ANYWHERE_STOP ? null : stop);

export const formatSalesRadius = (km: number | null | undefined) =>
  km == null ? 'Anywhere' : `${km} km`;

export const SalesRadiusSlider = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (km: number | null) => void;
}) => {
  const { colors } = useTheme();
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const originRef = useRef(0);
  const lastStopRef = useRef(stopFor(value));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  lastStopRef.current = stopFor(value);

  const updateFromX = (x: number) => {
    const usable = widthRef.current - THUMB_SIZE;
    if (usable <= 0) return;
    const fraction = Math.min(Math.max((x - THUMB_SIZE / 2) / usable, 0), 1);
    const stop = Math.round(SALES_RADIUS_MIN_KM + fraction * STOP_SPAN);
    if (stop !== lastStopRef.current) {
      lastStopRef.current = stop;
      onChangeRef.current(kmForStop(stop));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the parent ScrollView from stealing the drag.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_evt, gesture) => {
        const startX = gesture.x0;
        trackRef.current?.measure((_x, _y, _w, _h, pageX) => {
          originRef.current = pageX;
          updateFromX(startX - pageX);
        });
      },
      onPanResponderMove: (_evt, gesture) =>
        updateFromX(gesture.moveX - originRef.current),
    }),
  ).current;

  const fraction = (stopFor(value) - SALES_RADIUS_MIN_KM) / STOP_SPAN;
  const thumbLeft = fraction * Math.max(trackWidth - THUMB_SIZE, 0);
  const step = (delta: number) => {
    const next = Math.min(
      Math.max(stopFor(value) + delta, SALES_RADIUS_MIN_KM),
      ANYWHERE_STOP,
    );
    onChange(kmForStop(next));
  };

  return (
    <View style={sliderStyles.wrapper}>
      <View style={sliderStyles.headerRow}>
        <Text style={[sliderStyles.title, { color: colors.text }]}>
          Maximum distance
        </Text>
        <Text style={[sliderStyles.value, { color: colors.primary }]}>
          {formatSalesRadius(value)}
        </Text>
      </View>
      <View
        ref={trackRef}
        style={sliderStyles.touchArea}
        onLayout={e => {
          widthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Maximum selling distance"
        accessibilityValue={{ text: formatSalesRadius(value) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={e =>
          step(e.nativeEvent.actionName === 'increment' ? 5 : -5)
        }
        {...panResponder.panHandlers}
      >
        <View
          style={[sliderStyles.track, { backgroundColor: colors.border }]}
        />
        <View
          style={[
            sliderStyles.trackFill,
            {
              width: thumbLeft + THUMB_SIZE / 2,
              backgroundColor: colors.primary,
            },
          ]}
        />
        <View
          style={[
            sliderStyles.thumb,
            {
              left: thumbLeft,
              backgroundColor: colors.primary,
              borderColor: colors.background,
            },
          ]}
        />
      </View>
      <View style={sliderStyles.scaleRow}>
        <Text style={[sliderStyles.scaleText, { color: colors.text }]}>
          {SALES_RADIUS_MIN_KM} km
        </Text>
        <Text style={[sliderStyles.scaleText, { color: colors.text }]}>
          Anywhere
        </Text>
      </View>
      <Text style={[sliderStyles.hint, { color: colors.text }]}>
        {value == null
          ? 'Buyers anywhere can see and order this listing.'
          : `Only buyers within ${value} km of where you are now can see and order this listing, so delivery trips stay short.`}
      </Text>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  wrapper: { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '800' },
  touchArea: { height: 40, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2 },
  trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { fontSize: 11, opacity: 0.6 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8, opacity: 0.8 },
});

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
