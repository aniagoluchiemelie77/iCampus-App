export const PRIMARY_COLOR = '#f54b02';
export const PRIMARY_COLOR_TINT = '#f4a887';
export const PRIMARY_COLOR_TINT_MAIN = '#f0d2c4';

/**
 * Converts a `#RRGGBB` / `#RGB` colour into an `rgba()` string.
 * Used for tinted backgrounds and borders that stay legible in both themes.
 */
export const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace('#', '').trim();
  const isShortHand = normalized.length === 3;

  const channel = (start: number) =>
    parseInt(
      isShortHand
        ? normalized[start] + normalized[start]
        : normalized.slice(start, start + 2),
      16,
    );

  const r = channel(0);
  const g = channel(2);
  const b = channel(4);

  if ([r, g, b].some(Number.isNaN)) return hex;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const PREMIUM_BADGE_COLOR = '#93370f';
export const PRO_BADGE_COLOR = '#f54b02';
export const ENTERPRISE_BADGE_COLOR = '#f5770a';
export const BACKGROUND_LIGHT = '#fff';

// Ticketing severity colors
export const CRITICAL_SEVERITY = '#fa0000';
export const HIGH_SEVERITY = '#f93535';
export const MEDIUM_SEVERITY = '#fb6464';
export const LOW_SEVERITY = '#f9a0a0';

export const DEFAULT_GRADIENT = ['#241c18', '#70432e', '#e05515'];
export const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']; 




