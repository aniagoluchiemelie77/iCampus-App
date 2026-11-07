jest.mock('../src/context/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));
import { matchShortAnswer as m } from '../src/utils/answerMatching';
import { insertAtSelection } from '../src/components/MathSymbolBar';
const ok = (s: string, c: string) => m(s, c).isCorrect;
test('old false positives are now wrong', () => {
  expect(ok('-5', '5')).toBe(false);
  expect(ok('15', '5')).toBe(false);
  expect(ok('x2', 'x²')).toBe(false);
  expect(ok('16', '√16')).toBe(false);
  expect(ok('2', 'π/2')).toBe(false);
});
test('numeric equivalence', () => {
  expect(ok('0.5', '1/2')).toBe(true);
  expect(ok('½', '0.5')).toBe(true);
  expect(ok('4', '√16')).toBe(true);
  expect(ok('2²', '4')).toBe(true);
  expect(ok('−3', '-3')).toBe(true);
  expect(ok('x = 7', '7')).toBe(true);
  expect(ok('1,000', '1000')).toBe(true);
  expect(ok('50%', '0.5')).toBe(true);
  expect(ok('2π', '6.283185307')).toBe(true);
  expect(m('9', '7').confident).toBe(true);
});
test('symbols & text', () => {
  expect(ok('X² + 1', 'x²+1')).toBe(true);
  expect(ok('x²', 'x²+1')).toBe(false);
  expect(m('x*x', 'x²').confident).toBe(false); // AI decides
  expect(ok('It is Photosynthesis.', 'photosynthesis')).toBe(true);
  expect(ok('synthesis', 'photosynthesis')).toBe(false);
  expect(m('It is Photosynthesis', 'photosynthesis').confident).toBe(false);
  expect(ok('', '5')).toBe(false);
  expect(ok('anything', '')).toBe(false);
});
test('no code reaches mathjs', () => {
  expect(m('import("x")', '5').isCorrect).toBe(false);
  expect(m('createUnit("a")', 'createUnit("a")').method).toBe('exact');
});
test('insertAtSelection', () => {
  expect(insertAtSelection('ab', { start: 1, end: 1 }, 'π')).toEqual({ text: 'aπb', selection: { start: 2, end: 2 } });
  expect(insertAtSelection('ab', null, '²').text).toBe('ab²');
  expect(insertAtSelection('a', { start: 1, end: 1 }, '|x|')).toEqual({ text: 'a||', selection: { start: 2, end: 2 } });
  expect(insertAtSelection('abc', { start: 0, end: 3 }, '√').text).toBe('√');
});
