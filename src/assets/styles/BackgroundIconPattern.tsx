import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR_TINT, PRIMARY_COLOR_TINT_MAIN } from './colors';

/**
 * What iCampus is: classes and courses, live lectures, attendance,
 * assessments, the AI assistant, the campus feed and community, the student
 * marketplace and the iCash wallet. Ordered so neighbours differ.
 */
const ICONS = [
  'school',
  'storefront',
  'live-tv',
  'menu-book',
  'how-to-reg',
  'account-balance-wallet',
  'quiz',
  'forum',
  'psychology',
  'shopping-bag',
  'co-present',
  'event-note',
  'groups',
  'science',
  'emoji-objects',
  'calculate',
];

// Never draw more than this many glyphs, however big the screen.
const MAX_ICONS = 420;

/**
 * Faint icon wallpaper behind the auth screens. Laid out on a staggered grid
 * sized from the current window, so it covers phones and wide desktop
 * windows alike and re-flows when the window is resized.
 */
export const IconBackground = () => {
  const { width, height } = useWindowDimensions();

  const cells = useMemo(() => {
    // Roomier spacing on big screens keeps the pattern calm.
    let cell = width >= 1024 ? 76 : width >= 600 ? 66 : 56;
    let cols = Math.ceil(width / cell) + 1;
    let rows = Math.ceil(height / cell) + 1;
    while (cols * rows > MAX_ICONS) {
      cell += 6;
      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
    }
    const items = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        // Offset every other row by half a cell, and shift the icon sequence
        // per row, so no straight columns of the same icon appear.
        const name = ICONS[(c * 5 + r * 3) % ICONS.length];
        const accent = (r + c * 2) % 7 === 0;
        items.push({
          key: i,
          name,
          left: c * cell + (r % 2 ? cell / 2 : 0) - cell / 2,
          top: r * cell,
          size: accent ? Math.round(cell * 0.42) : Math.round(cell * 0.32),
          color: accent ? PRIMARY_COLOR_TINT : PRIMARY_COLOR_TINT_MAIN,
          rotate: `${((r * 7 + c * 11) % 5) * 6 - 12}deg`,
          cell,
        });
      }
    }
    return items;
  }, [width, height]);

  return (
    <View style={styles.container} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      {cells.map(item => (
        <View
          key={item.key}
          style={[
            styles.cell,
            {
              left: item.left,
              top: item.top,
              width: item.cell,
              height: item.cell,
              transform: [{ rotate: item.rotate }],
            },
          ]}
        >
          <MaterialIcons name={item.name} size={item.size} color={item.color} />
        </View>
      ))}
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
    overflow: 'hidden',
    zIndex: 0,
    opacity: 0.85,
  },
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
