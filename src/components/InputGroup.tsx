import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Internship',
];

interface InputGroupProps extends TextInputProps {
  label: string;
  isLocked?: boolean;
  type?: 'text' | 'phone';
  countryCode?: string;
  onChangeText?: (text: string) => void;
  value?: string;
  defaultValue?: string;
}
export interface InfoListCardProps<T> {
  title: string;
  iconName: React.ComponentProps<typeof MaterialIcons>['name'];
  data: T[] | undefined | null;
  renderItem: (item: T) => React.ReactNode;
  emptyText?: string;
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
export const InfoListCard = <T extends unknown>({
  title,
  iconName,
  data,
  renderItem,
  emptyText,
}: InfoListCardProps<T>) => {
  const { colors } = useTheme();

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <MaterialIcons name={iconName} size={20} color={colors.text} />
        <Text style={[styles.cardTitle, { color: colors.textDarker }]}>
          {title}
        </Text>
      </View>

      <View style={styles.cardContent}>
        {!data || data.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.primaryTint }]}>
            {emptyText || 'No data available.'}
          </Text>
        ) : (
          data.map((item, index) => (
            <View
              key={index}
              style={[
                styles.listItem,
                index !== data.length - 1 && {
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              {renderItem(item)}
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export const JobTypePicker = ({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (val: string) => void;
}) => {
  const [visible, setVisible] = React.useState(false);
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text, marginBottom: 15 }]}>
        Job Type
      </Text>

      <TouchableOpacity
        style={[styles.dropdown, { borderColor: colors.border }]}
        onPress={() => setVisible(true)}
      >
        <Text style={[styles.label, { color: colors.text }]}>{value}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <ScrollView
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {JOB_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.option, { borderBottomColor: colors.border }]}
                onPress={() => {
                  onSelect(type);
                  setVisible(false);
                }}
              >
                <Text style={[styles.label, { color: colors.text }]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </Modal>
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
  label: { fontSize: 14, fontWeight: '600' },
  lockBadge: { alignContent: 'center' },
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
  cardContainer: {
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardContent: {
    width: '100%',
  },
  listItem: {
    padding: 10,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  container: { marginBottom: 15 },
  dropdown: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    margin: 0,
    borderRadius: 25,
    padding: 20,
    height: '70%',
  },
  option: {
    marginBottom: 15,
    borderBottomWidth: 1,
  },
});
