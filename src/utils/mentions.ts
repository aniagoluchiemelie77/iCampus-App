// Mention ("@username") helpers for the post composer. Pure functions so the
// editing rules can be unit-tested without rendering a TextInput.
//
// A *token* is a confirmed mention such as "@ada.obi", i.e. one the user picked
// from the suggestion list. Only tokens are highlighted and treated atomically;
// any other "@text" is just text.

export interface MentionRange {
  start: number; // index of "@"
  end: number; // index just past the last character
  token: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every occurrence of every token, as a whole word, sorted by position. */
export const findMentionRanges = (
  text: string,
  tokens: string[],
): MentionRange[] => {
  const ranges: MentionRange[] = [];
  // Longest first so "@ada.obi" wins over "@ada" at the same position.
  const unique = Array.from(new Set(tokens)).sort((a, b) => b.length - a.length);
  unique.forEach(token => {
    const pattern = new RegExp(
      `(^|\\s)(${escapeRegExp(token)})(?=$|[^A-Za-z0-9_.])`,
      'g',
    );
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const start = match.index + match[1].length;
      const end = start + token.length;
      if (!ranges.some(r => start < r.end && end > r.start)) {
        ranges.push({ start, end, token });
      }
    }
  });
  return ranges.sort((a, b) => a.start - b.start);
};

/** Splits text into plain and mention segments for styled rendering. */
export const splitTextWithMentions = (text: string, tokens: string[]) => {
  const segments: { text: string; isMention: boolean }[] = [];
  let cursor = 0;
  findMentionRanges(text, tokens).forEach(range => {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), isMention: false });
    }
    segments.push({ text: text.slice(range.start, range.end), isMention: true });
    cursor = range.end;
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMention: false });
  }
  return segments;
};

/**
 * Applies an edit with mention-aware deletion: if a deletion touches any part
 * of a mention, the whole mention (including "@") is removed so the user can
 * start afresh. Returns the resulting text and where the caret should be.
 */
export const applyMentionAwareChange = (
  previous: string,
  next: string,
  tokens: string[],
): { text: string; cursor: number; removedMention: boolean } => {
  // Locate the edited span by trimming the common prefix and suffix.
  let prefix = 0;
  const maxPrefix = Math.min(previous.length, next.length);
  while (prefix < maxPrefix && previous[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  const maxSuffix = Math.min(previous.length, next.length) - prefix;
  while (
    suffix < maxSuffix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix++;
  }
  const removedStart = prefix;
  const removedEnd = previous.length - suffix;
  const inserted = next.slice(prefix, next.length - suffix);

  const isDeletion = removedEnd > removedStart;
  if (isDeletion) {
    // Backspace right after "@name" only removes its last character, which
    // still lands inside the range, so it is caught here too.
    const touched = findMentionRanges(previous, tokens).filter(
      r => removedStart < r.end && removedEnd > r.start,
    );
    if (touched.length > 0) {
      const start = Math.min(removedStart, ...touched.map(r => r.start));
      const end = Math.max(removedEnd, ...touched.map(r => r.end));
      return {
        text: previous.slice(0, start) + inserted + previous.slice(end),
        cursor: start + inserted.length,
        removedMention: true,
      };
    }
  }
  return {
    text: next,
    cursor: prefix + inserted.length,
    removedMention: false,
  };
};

/** The "@partial" being typed just before the caret, if any. */
export const getActiveMentionQuery = (
  text: string,
  cursor: number,
  tokens: string[],
): { query: string; start: number } | null => {
  const before = text.slice(0, cursor);
  const match = before.match(/(^|\s)@([A-Za-z0-9_.]*)$/);
  if (!match) return null;
  const start = before.length - match[2].length - 1;
  // Caret sitting at the end of a confirmed mention is not a new search.
  if (findMentionRanges(text, tokens).some(r => r.start === start && r.end === cursor)) {
    return null;
  }
  return { query: match[2], start };
};

/** Mentions already present in existing content (used when editing a post). */
export const extractMentionTokens = (text: string) =>
  Array.from(
    new Set((text.match(/(?:^|\s)(@[A-Za-z0-9_.]+)/g) || []).map(m => m.trim())),
  );
