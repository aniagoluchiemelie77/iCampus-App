// Contrast Utility
export const getContrastColor = (hexColor: string) => {
  // If no color is provided or it's the default gradient, return white
  if (!hexColor || hexColor.startsWith('url')) return '#FFFFFF';

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1E293B' : '#FFFFFF';
};