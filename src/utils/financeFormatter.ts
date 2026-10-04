export const formatInputWithCommas = (value: string) => {
  if (!value) return '';
  const cleanNumeric = value.replace(/[^0-9.]/g, '');
  const parts = cleanNumeric.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
};