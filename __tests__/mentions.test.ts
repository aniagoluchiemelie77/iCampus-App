import {
  applyMentionAwareChange,
  findMentionRanges,
  getActiveMentionQuery,
  splitTextWithMentions,
  extractMentionTokens,
} from '../src/utils/mentions';

const tokens = ['@ada.obi', '@tunde'];

describe('highlighting', () => {
  it('splits confirmed mentions out as their own segments', () => {
    expect(splitTextWithMentions('hi @ada.obi and @tunde!', tokens)).toEqual([
      { text: 'hi ', isMention: false },
      { text: '@ada.obi', isMention: true },
      { text: ' and ', isMention: false },
      { text: '@tunde', isMention: true },
      { text: '!', isMention: false },
    ]);
  });

  it('does not highlight unconfirmed or partial matches', () => {
    expect(findMentionRanges('@tundex and email@tunde', tokens)).toEqual([]);
    expect(findMentionRanges('@someone', tokens)).toEqual([]);
  });
});

describe('mention-aware deletion', () => {
  it('backspace at the end of a mention removes the whole "@name"', () => {
    const prev = 'hello @tunde';
    const r = applyMentionAwareChange(prev, 'hello @tund', tokens);
    expect(r).toEqual({ text: 'hello ', cursor: 6, removedMention: true });
  });

  it('deleting the "@" removes the name too', () => {
    const r = applyMentionAwareChange('hey @tunde ok', 'hey tunde ok', tokens);
    expect(r.text).toBe('hey  ok');
    expect(r.cursor).toBe(4);
  });

  it('deleting a character in the middle removes the whole mention', () => {
    const r = applyMentionAwareChange('cc @ada.obi now', 'cc @ada.bi now', tokens);
    expect(r.text).toBe('cc  now');
  });

  it('a selection covering part of a mention removes the whole mention', () => {
    // Select "unde b" and delete: the partial "@t" must not survive.
    const r = applyMentionAwareChange('a @tunde b', 'a @t', tokens);
    expect(r.text).toBe('a ');
    expect(r.cursor).toBe(2);
  });

  it('ordinary deletions are untouched', () => {
    const r = applyMentionAwareChange('hello @tunde!!', 'hello @tunde!', tokens);
    expect(r).toEqual({ text: 'hello @tunde!', cursor: 13, removedMention: false });
  });

  it('typing is untouched', () => {
    const r = applyMentionAwareChange('hi', 'hi there', tokens);
    expect(r).toEqual({ text: 'hi there', cursor: 8, removedMention: false });
  });
});

describe('mention lookup', () => {
  it('finds the partial being typed at the caret, not just at the end', () => {
    const text = 'thanks @tu for the notes';
    expect(getActiveMentionQuery(text, 10, tokens)).toEqual({ query: 'tu', start: 7 });
  });

  it('ignores a caret resting on a confirmed mention', () => {
    expect(getActiveMentionQuery('hi @tunde', 9, tokens)).toBeNull();
  });

  it('ignores "@" inside words such as emails', () => {
    expect(getActiveMentionQuery('mail me@x', 9, tokens)).toBeNull();
  });
});

it('extracts existing mentions when editing a post', () => {
  expect(extractMentionTokens('@ada.obi hi @tunde and @ada.obi')).toEqual([
    '@ada.obi',
    '@tunde',
  ]);
});
