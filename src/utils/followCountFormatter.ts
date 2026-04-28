export const formatCount = (num: number) => {
  if (!num || isNaN(num)) return "0";
  if (num >= 10000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return num.toLocaleString();
};