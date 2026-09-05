import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  iconName?: string;
  title: string;
  subtitle?: string;
  buttonText?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'find-in-page',
  title,
  subtitle,
  buttonText,
  onPress,
  style,
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        style,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <MaterialIcons name={iconName} size={60} color={colors.primary} />
      <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>

      {buttonText && onPress && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.btnColor }]}
          onPress={onPress}
        >
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    width: 'auto',
    height: 50,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});