/**
 * Auto-grading for short answers.
 *
 * The old grader deleted every character except a-z and 0-9, so "-5"
 * matched "5", "x²" matched "x2" and "√16" matched "16". This keeps
 * symbols, and compares numeric answers by value with mathjs, so "1/2",
 * "0.5" and "½" are equal.
 *
 * `confident` says whether the result should be final. Unconfident results
 * (free-text answers that don't match exactly) are sent to AI grading, with
 * the result here used if the AI is unavailable.
 */
import { create, all } from 'mathjs';

const math = create(all, {});

export type AnswerMatch = {
  isCorrect: boolean;
  confident: boolean;
  method: 'numeric' | 'exact' | 'keywords' | 'empty';
};

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', 'ⁿ': 'n',
};
const SUBSCRIPTS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
};
const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '(1/2)', '⅓': '(1/3)', '⅔': '(2/3)', '¼': '(1/4)', '¾': '(3/4)',
  '⅕': '(1/5)', '⅖': '(2/5)', '⅗': '(3/5)', '⅘': '(4/5)', '⅙': '(1/6)',
  '⅚': '(5/6)', '⅛': '(1/8)', '⅜': '(3/8)', '⅝': '(5/8)', '⅞': '(7/8)',
};

/** Same-meaning characters, so typing style doesn't change the grade. */
const canonical = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[−‒–—]/g, '-') // minus/dash variants
    .replace(/[·⋅]/g, '×') // middle dots used as "times"
    .replace(/\s+/g, ' ');

/** For exact comparison: no spaces, no trailing full stop, no quotes. */
const compact = (value: string) =>
  canonical(value)
    .replace(/["'“”‘’]/g, '')
    .replace(/\.$/, '')
    .replace(/\s/g, '');

/** Final answer from "x = 5" style working: the part after the last "=". */
const finalPart = (value: string) => {
  const parts = value.split('=');
  return parts[parts.length - 1];
};

/**
 * Converts a typed answer to a mathjs expression, or null when it isn't a
 * pure number/arithmetic. Only digits, operators, brackets, π, e and roots
 * are allowed, so nothing else ever reaches mathjs.
 */
const toNumericExpression = (value: string): string | null => {
  let expr = canonical(finalPart(value)).replace(/\s/g, '');
  if (!expr) return null;
  // Thousands separators: 1,000,000 -> 1000000
  expr = expr.replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
  expr = expr.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, f => VULGAR_FRACTIONS[f]);
  // Superscript runs -> ^(…)
  expr = expr.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, run =>
    `^(${[...run].map(c => SUPERSCRIPTS[c]).join('')})`,
  );
  expr = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, '(pi)')
    // √16, √(x), ∛8
    .replace(/∛(\d+(\.\d+)?|\([^()]*\))/g, 'cbrt($1)')
    .replace(/√(\d+(\.\d+)?|\([^()]*\))/g, 'sqrt($1)')
    .replace(/(\d+(\.\d+)?)%/g, '($1/100)');
  // Implicit multiplication like 2(pi) or 2sqrt(3) -> 2*(pi)
  expr = expr.replace(/(\d|\))(?=\(|sqrt|cbrt)/g, '$1*');
  // Whitelist: everything else (letters, units, words) is not numeric.
  const stripped = expr.replace(/sqrt|cbrt|pi/g, '');
  if (!/^[0-9.+\-*/^()]+$/.test(stripped)) return null;
  if (!/\d|pi/.test(expr)) return null;
  return expr;
};

const evaluateNumber = (value: string): number | null => {
  const expr = toNumericExpression(value);
  if (!expr) return null;
  try {
    const result = math.evaluate(expr);
    const n = typeof result === 'number' ? result : Number(result);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

// Plain punctuation, not \p{L}: keeps this safe on every JS engine.
const WORD_SEPARATORS = /[\s.,;:!?()[\]{}"'“”‘’\-\/]+/;

const nearlyEqual = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(1e-9, 1e-6 * Math.max(Math.abs(a), Math.abs(b)));

/** True when the text uses digits or maths symbols (not just words). */
const looksMathematical = (value: string) =>
  // Subscripts listed one by one (no range), so it parses in any encoding.
  /[0-9+\-*/^=<>≤≥≠≈±×÷√∛π∞°%½¼¾∫∂∑∏Δ∇∠⊥∥⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉∈∉⊂⊆∪∩∅∀∃¬∧∨⊕⇒⇔≡→←↔⇌]/.test(
    value,
  );

export const matchShortAnswer = (
  studentAnswer: string,
  correctAnswer: string,
): AnswerMatch => {
  const student = String(studentAnswer ?? '');
  const correct = String(correctAnswer ?? '');
  if (!compact(correct) || !compact(student)) {
    return { isCorrect: false, confident: true, method: 'empty' };
  }

  // 1. Numbers: compare values ("1/2" = "0.5" = "½"; "-5" ≠ "5").
  const expected = evaluateNumber(correct);
  if (expected !== null) {
    const given = evaluateNumber(student);
    return {
      isCorrect: given !== null && nearlyEqual(given, expected),
      confident: true,
      method: 'numeric',
    };
  }

  // 2. Same text, ignoring spaces, case and typing variants.
  if (compact(student) === compact(correct)) {
    return { isCorrect: true, confident: true, method: 'exact' };
  }

  // 3. Formulas/expressions must match exactly: "x²+1" is not "x²".
  if (looksMathematical(correct)) {
    return { isCorrect: false, confident: false, method: 'exact' };
  }

  // 4. Word answers: the expected key words appear in the answer, as whole
  //    words. Left for AI grading to confirm.
  const toWords = (value: string) =>
    canonical(value).split(WORD_SEPARATORS).filter(Boolean);
  const words = toWords(correct);
  const studentWords = new Set(toWords(student));
  const hasAll = words.length > 0 && words.every(w => studentWords.has(w));
  return { isCorrect: hasAll, confident: false, method: 'keywords' };
};
