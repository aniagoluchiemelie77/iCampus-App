import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR_TINT, PRIMARY_COLOR_TINT_MAIN } from './colors';

const { width } = Dimensions.get('window');

const icons = ['auto-stories', 'shopping-cart', 'account-balance', 'diamond'];

const ICON_SPACING = 20;

export const IconBackground = () => {
  const iconElements = [];
  const totalIcons = 200;

  for (let i = 0; i < totalIcons; i++) {
    const icon = icons[i % icons.length];
    const size = i % 7 === 0 ? 27 : 20;
    const color = i % 5 === 0 ? PRIMARY_COLOR_TINT : PRIMARY_COLOR_TINT_MAIN;

    iconElements.push(
      <MaterialIcons
        key={i}
        name={icon}
        size={size}
        color={color}
        style={{
          margin: ICON_SPACING / 2,
        }}
      />,
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>{iconElements}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    zIndex: 0,
    pointerEvents: 'none',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
