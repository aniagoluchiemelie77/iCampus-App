import type { ViewStyle } from 'react-native';

/**
 * Widths for content on wide screens (desktop web, tablets). Scroll areas
 * stay full width, so the mouse wheel works anywhere on the page, while
 * their content sits in a centered column instead of stretching edge to edge.
 */
export const READING_WIDTH = 720; // posts, comments, detail pages
export const PAGE_WIDTH = 900; // profile, settings and other list pages

/** Use in contentContainerStyle (or on a wrapper) to center a column. */
export const centeredColumn = (maxWidth: number = PAGE_WIDTH): ViewStyle => ({
  width: '100%',
  maxWidth,
  alignSelf: 'center',
});
