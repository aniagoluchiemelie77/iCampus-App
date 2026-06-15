import React from 'react';
import { View, Text, StyleSheet, TextInput, TextInputProps} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

interface InputGroupProps extends TextInputProps {
  label: string;
  isLocked?: boolean;
  type?: 'text' | 'phone';
  countryCode?: string;
  onChangeText?: (text: string) => void;
  value?: string;
  defaultValue?: string;
}

export const InputGroup = ({
  countryCode,
  type,
  label,
  isLocked,
  defaultValue,
  onChangeText,
  ...textInputProps
}: InputGroupProps) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.groupContainer,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {isLocked && (
          <View style={styles.lockBadge}>
            <MaterialIcons
              name="lock-outlined"
              size={14}
              color={colors.primary}
            />
          </View>
        )}
      </View>
      <View style={[styles.inputWrapper, { borderColor: colors.border }]}>
        {type === 'phone' && (
          <View style={styles.countrySelector}>
            <Text style={[styles.countryText, { color: colors.text }]}>
              {countryCode || '+234'}
            </Text>
            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />
          </View>
        )}

        <TextInput
          {...textInputProps}
          editable={!isLocked}
          defaultValue={defaultValue}
          keyboardType={
            type === 'phone' ? 'phone-pad' : textInputProps.keyboardType
          }
          style={[
            styles.input,
            { color: colors.text },
            type === 'phone' && { flex: 1 },
          ]}
          onChangeText={onChangeText}
          placeholderTextColor={colors.inputTextHolder}
        />
      </View>
      {isLocked && (
        <Text style={[styles.helperText, { color: colors.text }]}>
          Contact support to update verified details.
        </Text>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  groupContainer: { marginBottom: 15, padding: 10, borderRadius: 10 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  label: { fontSize: 15, fontWeight: '600' },
  lockBadge: { alignContent: 'center' },
  lockText: { fontSize: 10, color: '#888', marginLeft: 4 },
  inputWrapper: {
    borderRadius: 8,
    borderWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 20,
    marginLeft: 6,
  },
  input: { padding: 12, fontSize: 14, minHeight: 48, flex: 1 },
  helperText: { fontSize: 11, marginTop: 4, fontWeight: '700' },
});
