import { useTheme } from '../context/ThemeContext';
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import { useAppSelector } from '../hooks/hooks.ts';
interface CurrencyDisplayProps {
  value: number;
  size?: 'small' | 'medium' | 'large';
  containerStyle?: ViewStyle;
}

export const CurrencyDisplay = ({
  value,
  size = 'medium',
  containerStyle,
}: CurrencyDisplayProps) => {
  const { colors } = useTheme();
  const { country } = useAppSelector(state => state.user);
  const { exchangeData } = useExchangeRate(country || 'Nigeria');
  const formattedString = Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: true,
  });
  const [integer, decimal] = formattedString.split('.');

  const config = {
    small: { currencySize: 12, integer: 16, decimal: 10, spacing: 4 },
    medium: { currencySize: 16, integer: 24, decimal: 14, spacing: 6 },
    large: { currencySize: 20, integer: 36, decimal: 18, spacing: 8 },
  };

  const {
    currencySize,
    integer: intSize,
    decimal: decSize,
    spacing,
  } = config[size];
  const activeColor = colors.primary;
  return (
    <View style={[styles.balanceContainer, containerStyle]}>
      <Text
        style={{
          fontSize: currencySize,
          fontWeight: 'bold',
          marginRight: spacing,
        }}
      >
        {exchangeData.symbol}
      </Text>
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
