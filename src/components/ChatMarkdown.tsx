import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/**
 * Minimal chat markdown for AI replies: paragraphs, "- " / "* " bullets,
 * "1. " steps, **bold**, *italic* and `code`. Headings are rendered as bold
 * lines. Anything else is shown as plain text.
 */
const renderInline = (text: string, color: string, codeBg: string, keyBase: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <Text key={key} style={[md.bold, { color }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <Text key={key} style={[md.code, { color, backgroundColor: codeBg }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (/^(\*[^*]+\*|_[^_]+_)$/.test(part)) {
      return (
        <Text key={key} style={md.italic}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return part;
  });
};

export const ChatMarkdown = ({
  content,
  color,
  accent,
  codeBg = 'rgba(0,0,0,0.06)',
}: {
  content: string;
  color: string;
  accent: string;
  codeBg?: string;
}) => {
  const lines = String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .split('\n');

  const blocks: React.ReactNode[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push(<View key={`sp-${i}`} style={md.spacer} />);
      return;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <View key={i} style={md.listRow}>
          <View style={[md.dot, { backgroundColor: accent }]} />
          <Text style={[md.text, md.listText, { color }]}>
            {renderInline(bullet[1], color, codeBg, `b${i}`)}
          </Text>
        </View>,
      );
    } else if (numbered) {
      blocks.push(
        <View key={i} style={md.listRow}>
          <Text style={[md.number, { color: accent }]}>{numbered[1]}.</Text>
          <Text style={[md.text, md.listText, { color }]}>
            {renderInline(numbered[2], color, codeBg, `n${i}`)}
          </Text>
        </View>,
      );
    } else if (heading) {
      blocks.push(
        <Text key={i} style={[md.text, md.bold, { color }]}>
          {renderInline(heading[1].replace(/\*\*/g, ''), color, codeBg, `h${i}`)}
        </Text>,
      );
    } else {
      blocks.push(
        <Text key={i} style={[md.text, { color }]}>
          {renderInline(line, color, codeBg, `p${i}`)}
        </Text>,
      );
    }
  });
  return <View>{blocks}</View>;
};

/** Three bouncing dots in an assistant bubble while a reply is on its way. */
export const TypingBubble = ({
  background,
  dotColor,
  label,
}: {
  background: string;
  dotColor: string;
  label?: string;
}) => {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [dots]);

  return (
    <View
      style={[md.typingBubble, { backgroundColor: background }]}
      accessibilityLabel={label || 'Assistant is typing'}
      accessibilityLiveRegion="polite"
    >
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            md.typingDot,
            {
              backgroundColor: dotColor,
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const md = StyleSheet.create({
  text: { fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 13.5, borderRadius: 4, paddingHorizontal: 3 },
  spacer: { height: 8 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginRight: 9 },
  number: { fontSize: 15, lineHeight: 22, fontWeight: '800', minWidth: 20, marginRight: 4 },
  listText: { flex: 1 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginLeft: 10,
    marginVertical: 7,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },
});
