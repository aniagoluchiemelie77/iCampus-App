import React from 'react';
import { View, Text, StyleSheet, TextInput, TextInputProps} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR } from './Classroomcomponent';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';

interface InputGroupProps extends TextInputProps {
  label: string;
  isLocked?: boolean;
  defaultValue: string;
  type?: 'text' | 'phone'; 
  countryCode?: string;  
  onChangeText?: (text: string) => void;
}

export const InputGroup = ({countryCode, type, label, isLocked, defaultValue, onChangeText, ...textInputProps }: InputGroupProps) => {
  return (
    <View style={styles.groupContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isLocked && (
          <View style={styles.lockBadge}>
            <MaterialIcons name="lock" size={14} color={PRIMARY_COLOR} />
          </View>
        )}
      </View>
      <View style={[
        styles.inputWrapper, 
        isLocked && styles.lockedBackground
      ]}>
        {type === 'phone' && (
          <View style={styles.countrySelector}>
            <Text style={styles.countryText}>{countryCode || '+234'}</Text>
            <View style={styles.divider} />
          </View>
        )}

        <TextInput
          {...textInputProps}
          editable={!isLocked}
          defaultValue={defaultValue}
          keyboardType={type === 'phone' ? 'phone-pad' : textInputProps.keyboardType}
          style={[
            styles.input, 
            type === 'phone' && { flex: 1 } 
          ]}
          onChangeText={onChangeText}
        />
      </View>
      {isLocked && (
        <Text style={styles.helperText}>
          Contact support to update verified details.
        </Text>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  groupContainer: { marginBottom: 15, paddingHorizontal: 13 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '600', color: '#222' },
  lockBadge: { alignContent: 'center'},
  lockText: { fontSize: 10, color: '#888', marginLeft: 4 },
  inputWrapper: {
    borderRadius: 8,
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    backgroundColor: '#fff',
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
    color: '#2222',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginLeft: 6,
  },
  input: { padding: 12, fontSize: 14, color: '#2222', minHeight: 48, flex: 1 },
  lockedBackground: { backgroundColor: '#fadccc' },
  helperText: { fontSize: 11, color: PRIMARY_COLOR_TINT, marginTop: 4 },
});
