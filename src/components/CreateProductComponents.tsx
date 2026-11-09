import React, { useMemo, useRef, useState } from 'react';
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
import {
  SALES_RADIUS_STOPS,
  describeRadius,
  formatLandmarkKm,
  landmarkForRadius,
  nearbyTowns,
} from '../utils/radiusLandmarks';
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
// Sales radius: snaps to meaningful stops, explains each one in plain words
// and, with the seller's location, names a real town at about that distance.
// ---------------------------------------------------------------------------
export const SALES_RADIUS_MIN_KM = SALES_RADIUS_STOPS[0];
export const SALES_RADIUS_MAX_KM = SALES_RADIUS_STOPS[SALES_RADIUS_STOPS.length - 1];
// The positions on the track: every stop, then Anywhere (null).
const RADIUS_POSITIONS: (number | null)[] = [...SALES_RADIUS_STOPS, null];
const LAST_POSITION = RADIUS_POSITIONS.length - 1;
const THUMB_SIZE = 26;

/** Track position for a value; older listings may hold an in-between km. */
const positionFor = (km: number | null) => {
  if (km == null) return LAST_POSITION;
  let best = 0;
  let bestDiff = Infinity;
  SALES_RADIUS_STOPS.forEach((stop, i) => {
    // Compare on a log scale: 37 km is "closer" to 50 than to 20.
    const diff = Math.abs(Math.log(Math.max(km, 0.5)) - Math.log(stop));
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  });
  return best;
};

export const formatSalesRadius = (km: number | null | undefined) =>
  km == null ? 'Anywhere' : `${km} km`;

export const SalesRadiusSlider = ({
  value,
  onChange,
  origin,
  campus,
}: {
  value: number | null;
  onChange: (km: number | null) => void;
  /** Seller's location, to name a nearby town at the chosen distance. */
  origin?: { lat: number; lng: number } | null;
  /** Seller's school, used to describe the shortest distances. */
  campus?: string | null;
}) => {
  const { colors } = useTheme();
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const widthRef = useRef(0);
  const originXRef = useRef(0);
  const position = positionFor(value);
  const lastPositionRef = useRef(position);
  lastPositionRef.current = position;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setPosition = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), LAST_POSITION);
    if (clamped === lastPositionRef.current) return;
    lastPositionRef.current = clamped;
    onChangeRef.current(RADIUS_POSITIONS[clamped]);
  };

  const updateFromX = (x: number) => {
    const usable = widthRef.current - THUMB_SIZE;
    if (usable <= 0) return;
    const fraction = Math.min(Math.max((x - THUMB_SIZE / 2) / usable, 0), 1);
    setPosition(Math.round(fraction * LAST_POSITION));
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
          originXRef.current = pageX;
          updateFromX(startX - pageX);
        });
      },
      onPanResponderMove: (_evt, gesture) =>
        updateFromX(gesture.moveX - originXRef.current),
    }),
  ).current;

  const usable = Math.max(trackWidth - THUMB_SIZE, 0);
  const xFor = (pos: number) => (pos / LAST_POSITION) * usable;
  const thumbLeft = xFor(position);

  const towns = useMemo(
    () => (origin ? nearbyTowns({ lat: origin.lat, lng: origin.lng }) : []),
    [origin?.lat, origin?.lng], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const description = describeRadius(value, campus);
  // Towns are a useful yardstick from 5 km up; below that, the campus is.
  const landmark = value != null && value >= 5 ? landmarkForRadius(towns, value) : null;

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
        accessibilityValue={{ text: `${formatSalesRadius(value)}, ${description.scope}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={e =>
          setPosition(position + (e.nativeEvent.actionName === 'increment' ? 1 : -1))
        }
        {...panResponder.panHandlers}
      >
        <View style={[sliderStyles.track, { backgroundColor: colors.border }]} />
        <View
          style={[
            sliderStyles.trackFill,
            { width: thumbLeft + THUMB_SIZE / 2, backgroundColor: colors.primary },
          ]}
        />
        {trackWidth > 0 &&
          RADIUS_POSITIONS.map((_, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[
                sliderStyles.tick,
                {
                  left: xFor(i) + THUMB_SIZE / 2 - 3,
                  backgroundColor: i <= position ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        <View
          style={[
            sliderStyles.thumb,
            { left: thumbLeft, backgroundColor: colors.primary, borderColor: colors.background },
          ]}
        />
      </View>
      {/* Tappable stop labels (also how mouse users pick a stop on web). */}
      <View style={[sliderStyles.labelsRow, { width: trackWidth || undefined }]}>
        {trackWidth > 0 &&
          RADIUS_POSITIONS.map((km, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setPosition(i)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={km == null ? 'Anywhere' : `${km} kilometres`}
              style={[sliderStyles.label, { left: xFor(i) + THUMB_SIZE / 2 - LABEL_WIDTH / 2 }]}
            >
              <Text
                style={[
                  sliderStyles.labelText,
                  { color: i === position ? colors.primary : colors.text },
                  i === position && sliderStyles.labelTextActive,
                ]}
              >
                {km == null ? 'Any' : km}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      <View
        style={[
          sliderStyles.contextCard,
          { backgroundColor: colors.primary + '10', borderColor: colors.primary + '33' },
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={[sliderStyles.contextIcon, { backgroundColor: colors.primary + '1F' }]}>
          <MaterialIcons name={description.icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sliderStyles.contextScope, { color: colors.textDarker || colors.text }]}>
            {description.scope}
          </Text>
          <Text style={[sliderStyles.contextTravel, { color: colors.text }]}>
            {description.travel}
          </Text>
          {landmark ? (
            <Text style={[sliderStyles.contextLandmark, { color: colors.primary }]}>
              About as far as {landmark.name} ({formatLandmarkKm(landmark.km)} from you)
            </Text>
          ) : value != null && value >= 5 && !origin ? (
            <Text style={[sliderStyles.contextHint, { color: colors.text }]}>
              Turn on location to compare with towns near you.
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={[sliderStyles.hint, { color: colors.text }]}>
        {value == null
          ? 'Buyers anywhere can see and order this listing.'
          : `Only buyers within ${value} km of where you are now can see and order this listing, so delivery trips stay short.`}
      </Text>
    </View>
  );
};

const LABEL_WIDTH = 34;

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
  tick: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
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
  labelsRow: { height: 22, position: 'relative' },
  label: { position: 'absolute', width: LABEL_WIDTH, alignItems: 'center' },
  labelText: { fontSize: 11.5, opacity: 0.75 },
  labelTextActive: { fontWeight: '800', opacity: 1 },
  contextCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextScope: { fontSize: 14, fontWeight: '800' },
  contextTravel: { fontSize: 12.5, marginTop: 2, opacity: 0.85 },
  contextLandmark: { fontSize: 12.5, fontWeight: '700', marginTop: 6 },
  contextHint: { fontSize: 12, marginTop: 6, opacity: 0.7, fontStyle: 'italic' },
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
