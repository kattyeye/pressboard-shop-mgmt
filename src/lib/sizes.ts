// Garment size order. The database stores sizes as JSON, which doesn't keep
// key order, so sizes are always sorted for display.
const ORDER = [
  "YXS", "YS", "YM", "YL", "YXL",
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
  "One size",
];

export function sortedSizes(sizes: Record<string, number>): [string, number][] {
  const rank = (s: string) => {
    const i = ORDER.indexOf(s);
    return i === -1 ? ORDER.length : i;
  };
  return Object.entries(sizes).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}
