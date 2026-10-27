import React from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

// Shared building blocks for the lecturer forms (create lecture, quick
// online class, assessment builder) so they look and behave the same.

interface FormCardProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}
export const FormCard = ({
  title,
  subtitle,
  icon,
  rightElement,
  children,
  style,
}: FormCardProps) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border + '40',
        },
        style,
      ]}
    >
      {(title || rightElement) && (
        <View style={styles.cardHeader}>
          {icon && (
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: colors.primary + '15' },
              ]}
            >
              <MaterialIcons name={icon} size={18} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {title && (
              <Text style={[styles.cardTitle, { color: colors.textDarker }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                {subtitle}
              </Text>
            )}
          </View>
          {rightElement}
        </View>
      )}
      {children}
    </View>
  );
};

export const FieldLabel = ({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.label, { color: colors.text }]}>{children}</Text>
      {hint && (
        <Text style={[styles.labelHint, { color: colors.inputTextHolder }]}>
          {hint}
        </Text>
      )}
    </View>
  );
};

interface FormInputProps extends TextInputProps {
  icon?: string;
  containerStyle?: StyleProp<ViewStyle>;
}
export const FormInput = ({
  icon,
  containerStyle,
  style,
  multiline,
  ...rest
}: FormInputProps) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.inputWrap,
        multiline && styles.inputWrapMultiline,
        { borderColor: colors.border + '80', backgroundColor: colors.background },
        containerStyle,
      ]}
    >
      {icon && (
        <MaterialIcons
          name={icon}
          size={20}
          color={colors.primary}
          style={[styles.inputIcon, multiline && { marginTop: 12 }]}
        />
      )}
      <TextInput
        placeholderTextColor={colors.inputTextHolder}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: colors.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
};

interface PickerTileProps {
  icon: string;
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}
/** A tappable field that opens a date/time/list picker. */
export const PickerTile = ({
  icon,
  label,
  value,
  placeholder = 'Select',
  onPress,
  disabled,
  style,
}: PickerTileProps) => {
  const { colors } = useTheme();
  const hasValue = !!value;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || placeholder}`}
      style={[
        styles.tile,
        {
          borderColor: hasValue ? colors.primary + '60' : colors.border + '80',
          backgroundColor: colors.background,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View
        style={[styles.tileIcon, { backgroundColor: colors.primary + '15' }]}
      >
        <MaterialIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
        <Text
          numberOfLines={1}
          style={[
            styles.tileValue,
            { color: hasValue ? colors.textDarker : colors.inputTextHolder },
          ]}
        >
          {value || placeholder}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.segmentWrap,
        { backgroundColor: colors.background, borderColor: colors.border + '60' },
      ]}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.primary },
            ]}
          >
            {option.icon && (
              <MaterialIcons
                name={option.icon}
                size={16}
                color={selected ? colors.btnTextColor : colors.text}
              />
            )}
            <Text
              style={[
                styles.segmentText,
                { color: selected ? colors.btnTextColor : colors.text },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const InfoBanner = ({
  icon = 'info-outline',
  text,
  color,
}: {
  icon?: string;
  text: string;
  color?: string;
}) => {
  const { colors } = useTheme();
  const tone = color || colors.primary;
  return (
    <View style={[styles.banner, { backgroundColor: tone + '12' }]}>
      <MaterialIcons name={icon} size={18} color={tone} />
      <Text style={[styles.bannerText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

/** "HH:mm" -> minutes since midnight, or null when unparseable. */
export const timeToMinutes = (time: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const describeDuration = (minutes: number) => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
};

/** Builds a Date for the date/time picker from "YYYY-MM-DD" and "HH:mm". */
export const pickerValueFrom = (date?: string, time?: string) => {
  const base = date ? new Date(`${date}T00:00:00`) : new Date();
  const value = isNaN(base.getTime()) ? new Date() : base;
  const minutes = time ? timeToMinutes(time) : null;
  if (minutes !== null) {
    value.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  }
  return value;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.3 },
  labelHint: { fontSize: 11.5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  inputWrapMultiline: { alignItems: 'flex-start' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14.5, paddingVertical: 12 },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flex: 1,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  tileValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
  },
  segmentText: { fontSize: 13.5, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  bannerText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
});
