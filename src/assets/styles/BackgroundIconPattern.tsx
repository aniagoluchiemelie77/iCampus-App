import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window')
const icons = ['bookshelf', 'star', 'podium', 'cart', 'bank', 'diamond'];
export const IconBackground = () => {
  const iconElements = [];

  for (let i = 0; i < 30; i++) {
    const icon = icons[i % icons.length];
    const size = i % 7 === 0 ? 40 : 30;
    const color = i % 5 === 0 ? '#f98c5eff' : '#fba47fff';
    const top = Math.random() * height;
    const left = Math.random() * width;

    iconElements.push(
      <MaterialCommunityIcons
        key={i}
        name={icon}
        size={size}
        color={color}
        style={[
          styles.icon,
          {
            top,
            left,
          },
        ]}
      />
    );
  }

  return <View style={styles.container}>{iconElements}</View>;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  icon: {
    position: 'absolute',
    opacity: 0.2,
  },
});

export default IconBackground;
