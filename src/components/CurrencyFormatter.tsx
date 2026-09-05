import { PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { useTheme } from '../context/ThemeContext';
import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface CurrencyDisplayProps {
  value: number;
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
  isSuccess?: boolean;
}

export const CurrencyDisplay = ({
  value,
  size = 'medium',
  containerStyle,
  isSuccess,
}: CurrencyDisplayProps) => {
  const { colors } = useTheme();
  const formattedString = value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const [integer, decimal] = formattedString.split('.');

  const config = {
    small: { icon: 12, integer: 16, decimal: 10, spacing: 4 },
    medium: { icon: 16, integer: 24, decimal: 14, spacing: 6 },
    large: { icon: 20, integer: 36, decimal: 18, spacing: 8 },
  };

  const { icon, integer: intSize, decimal: decSize, spacing } = config[size];
  const activeColor = isSuccess ? colors.primary : colors.primary;

  return (
    <View style={[styles.balanceContainer, containerStyle]}>
      <MaterialIcons
        name="diamond"
        size={icon}
        color={activeColor}
        style={{ marginRight: spacing }}
      />
      <Text
        style={[styles.balanceValue, { fontSize: intSize, color: activeColor }]}
      >
        {integer}
        <Text
          style={[
            styles.decimalValue,
            { fontSize: decSize, color: activeColor },
          ]}
        >
          .{decimal}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceValue: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  decimalValue: {
    fontWeight: '600',
    opacity: 0.85,
  },
});