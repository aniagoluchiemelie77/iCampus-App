import React, { useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * A row of tappable maths/science symbols for inputs, since phone keyboards
 * don't have √, π, ≤, ², θ and so on. Used by the lecturer's question editor
 * and the student's short-answer box.
 */
export const SYMBOL_GROUPS: { label: string; symbols: string[] }[] = [
  {
    label: 'Math',
    symbols: ['×', '÷', '±', '−', '≠', '≈', '≤', '≥', '√', '∛', 'π', '∞', '°', '%', '½', '¼', '¾', '∫', '∂', '∑', '∏', 'Δ', '∇', '∠', '⊥', '∥', '|x|'],
  },
  {
    label: 'x²',
    symbols: ['²', '³', 'ⁿ', '⁻¹', '⁺', '⁻', '⁰', '¹', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '₀', '₁', '₂', '₃', '₄', '₅', 'ₙ', 'ₓ'],
  },
  {
    label: 'Greek',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Ω', 'Σ', 'Φ', 'Γ', 'Λ'],
  },
  {
    label: 'Logic',
    symbols: ['∈', '∉', '⊂', '⊆', '∪', '∩', '∅', '∀', '∃', '¬', '∧', '∨', '⊕', '⇒', '⇔', '≡', '∴', '∵'],
  },
  {
    label: 'Arrows',
    symbols: ['→', '←', '↔', '⇌', '↑', '↓', '⟶', '⇒'],
  },
];

export type TextSelection = { start: number; end: number };

/**
 * Inserts `symbol` into `text` over the current selection.
 * Returns the new text and where the cursor should go.
 */
export const insertAtSelection = (
  text: string,
  selection: TextSelection | null | undefined,
  symbol: string,
): { text: string; selection: TextSelection } => {
  const length = text.length;
  const start = Math.min(Math.max(0, selection?.start ?? length), length);
  const end = Math.min(Math.max(start, selection?.end ?? start), length);
  // "|x|" is a label: insert the bars and place the cursor between them.
  const insert = symbol === '|x|' ? '||' : symbol;
  const cursor = start + (symbol === '|x|' ? 1 : insert.length);
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selection: { start: cursor, end: cursor },
  };
};

export const MathSymbolBar = ({
  onInsert,
  style,
}: {
  onInsert: (symbol: string) => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const { colors } = useTheme();
  const [group, setGroup] = useState(0);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.border + '40',
        },
        style,
      ]}
    >
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {SYMBOL_GROUPS.map((g, i) => (
          <TouchableOpacity
            key={g.label}
            onPress={() => setGroup(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: group === i }}
            style={[styles.tab, group === i && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[
                styles.tabText,
                { color: group === i ? colors.btnTextColor : colors.text },
              ]}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SYMBOL_GROUPS[group].symbols.map(symbol => (
          <TouchableOpacity
            key={symbol}
            onPress={() => onInsert(symbol)}
            accessibilityRole="button"
            accessibilityLabel={`Insert ${symbol}`}
            style={[styles.key, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.keyText, { color: colors.textDarker }]}>
              {symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6 },
  tabs: { gap: 6, paddingHorizontal: 10, paddingBottom: 6 },
  tab: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  tabText: { fontSize: 12, fontWeight: '700' },
  row: { gap: 6, paddingHorizontal: 10 },
  key: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  keyText: { fontSize: 18, fontWeight: '600' },
});
