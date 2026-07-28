import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {WATERMARK_TEXT} from '../../constants/inAppConstants';
import { PRIMARY_COLOR_TINT_MAIN } from './colors';

export const IcampusWatermark = () => {
  const textElements = [];
  const totalItems = 80;

  for (let i = 0; i < totalItems; i++) {
    const opacity = i % 3 === 0 ? 0.08 : 0.04;
    const fontSize = i % 5 === 0 ? 18 : 14;

    textElements.push(
      <Text
        key={i}
        style={[
          styles.watermarkText,
          {
            opacity,
            fontSize,
          },
        ]}
      >
        {WATERMARK_TEXT}
      </Text>
    );
  }

  return (
    <View style={styles.absoluteContainer} pointerEvents="none">
      <View style={styles.grid}>{textElements}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    transform: [{ rotate: '-25deg' }],
  },
  watermarkText: {
    fontWeight: 'bold',
    color: PRIMARY_COLOR_TINT_MAIN,
    margin: 25,
  },
});