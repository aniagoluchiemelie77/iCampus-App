import React from 'react';
import { View } from 'react-native';
import { Svg, Circle, G, Line } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing as ReEasing,
} from 'react-native-reanimated';

/**
 * PulseRadar
 * A radar-style listening animation: a sweep line and expanding rings.
 * Used in PhysicalAttendanceManager while listening for students.
 */
export const PulseRadar = ({
  size = 150,
  strokeWidth = 2,
  color = '#f54b02',
  speed = 2000,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  speed?: number;
}) => {
  const angle = useSharedValue(0);

  React.useEffect(() => {
    angle.value = withRepeat(
      withSequence(
        withTiming(360, { duration: speed, easing: ReEasing.linear }),
        withTiming(0, { duration: 200, easing: ReEasing.linear }),
      ),
      -1,
      false,
    );
  }, [speed]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${angle.value}deg` },
    ],
  }));

  const cx = size / 2;
  const cy = size / 2;

  return (
    <G>
      {/* Rotating sweep beam */}
      <G style={sweepStyle}>
        <Line
          x1={cx}
          y1={cy}
          x2={cx + 140}
          y2={cy}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </G>
      {/* Center dot */}
      <Circle cx={cx} cy={cy} r={6} fill={color} />
      <Circle cx={cx} cy={cy} r={2} fill="#fff" />
    </G>
  );
};

/**
 * PulseEmitter
 * An emitter-style beaconing animation: multiple concentric rings expanding outward.
 * Used in StudentAttendanceScanner while broadcasting to students.
 */
export const PulseEmitter = ({
  size = 150,
  strokeWidth = 3,
  color = '#f54b02',
  count = 4,
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  count?: number;
}) => {
  const phases = useSharedValue(0);

  React.useEffect(() => {
    phases.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: ReEasing.ease }),
        withTiming(0, { duration: 200, easing: ReEasing.ease }),
      ),
      -1,
      false,
    );
  }, []);

  const rings = Array.from({ length: count }, (_, i) => {
    const ringSize = (i + 1) * (size / (count + 1));
    return (
      <Circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={ringSize}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.3 + 0.7 * (1 - (ringSize / (size / 1.8)))}
      />
    );
  });

  return (
    <View>
      <G>
        {rings}
        {/* Central emitter dot */}
        <Circle cx={size / 2} cy={size / 2} r={10} fill={color} />
        <Circle cx={size / 2} cy={size / 2} r={4} fill="#fff" />
      </G>
    </View>
  );
};
