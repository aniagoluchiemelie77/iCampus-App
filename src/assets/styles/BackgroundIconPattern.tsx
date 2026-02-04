import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const icons = ['bookshelf', 'star', 'podium', 'cart', 'bank', 'diamond'];

const NUM_COLUMNS = 8; // Number of icons per row
const ICON_SIZE = 40;
const ICON_SPACING = 20; // Space between icons

export const IconBackground = () => {
  const iconElements = [];

  const totalIcons = 200;

  for (let i = 0; i < totalIcons; i++) {
    const icon = icons[i % icons.length];
    const size = i % 7 === 0 ? 27 : 20;
    const color = i % 5 === 0 ? 'rgb(247, 219, 207)' : 'rgb(244, 218, 207)';

    const row = Math.floor(i / NUM_COLUMNS);
    const col = i % NUM_COLUMNS;
    console.log(row, col, ICON_SIZE);

    iconElements.push(
      <MaterialCommunityIcons
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: width,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
