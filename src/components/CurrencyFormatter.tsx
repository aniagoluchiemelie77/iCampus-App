import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { useTheme } from 'context/ThemeContext';
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
    small: { icon: 16, integer: 16, decimal: 10, spacing: 4 },
    medium: { icon: 24, integer: 26, decimal: 16, spacing: 6 },
    large: { icon: 32, integer: 40, decimal: 20, spacing: 10 },
  };
  const { icon, integer: intSize, decimal: decSize, spacing } = config[size];
  return (
    <View style={[styles.balanceContainer, containerStyle]}>
      <MaterialIcons
        name="diamond-outlined"
        size={icon}
        color={isSuccess ? colors.success : colors.primary}
        style={styles.diamondShadow}
      />
      <Text
        style={[
          styles.balanceValue,
          { fontSize: intSize, marginLeft: spacing },
          { color: isSuccess ? colors.success : colors.primary },
        ]}
      >
        {integer}
        <Text
          style={[
            styles.decimalValue,
            { fontSize: decSize },
            { color: isSuccess ? colors.success : colors.primary },
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
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  decimalValue: {
    fontWeight: '600',
  },
  diamondShadow: {
    textShadowColor: PRIMARY_COLOR_TINT,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
