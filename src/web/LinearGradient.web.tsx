/**
 * Web version of react-native-linear-gradient (which is native-only).
 * Draws the gradient with CSS and still renders the children.
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

type Point = { x: number; y: number };
type Props = ViewProps & {
  colors: (string | number)[];
  start?: Point;
  end?: Point;
  locations?: number[];
};

const LinearGradient = ({
  colors = [],
  start = { x: 0.5, y: 0 },
  end = { x: 0.5, y: 1 },
  locations,
  style,
  ...rest
}: Props) => {
  // Angle from start→end points, in CSS degrees (0deg = to top).
  const angle =
    (Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI;
  const stops = colors
    .map((color, i) =>
      locations?.[i] != null ? `${color} ${locations[i] * 100}%` : `${color}`,
    )
    .join(', ');
  const gradient =
    colors.length > 1 ? `linear-gradient(${angle}deg, ${stops})` : undefined;

  return (
    <View
      {...rest}
      style={[
        { backgroundColor: String(colors[0] ?? 'transparent') },
        style,
        // react-native-web passes this through to CSS.
        gradient ? ({ backgroundImage: gradient } as any) : null,
      ]}
    />
  );
};

export default LinearGradient;
export { LinearGradient };
