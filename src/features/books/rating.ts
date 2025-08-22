export function formatOneDecimal(n: number): string {
  const clamped = Math.max(0, Math.min(5, n));
  return clamped.toFixed(1);
}

export function formatCount(n: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(n);
}
