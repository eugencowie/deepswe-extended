export const BLANK = "–";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Standard two-decimal currency. Sub-cent values collapse to $0.01 or $0.00
// on purpose: tier rows (ticket 08) produce tiny costs, and "effectively
// free" reads better than a string of leading zeros.
export function formatUsd(value: number | null): string {
  if (value === null) return BLANK;
  return usd.format(value);
}

export function formatPassAt1(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatTokens(value: number): string {
  return `${Math.round(value / 1000)}k`;
}

export function formatInteger(value: number): string {
  return `${Math.round(value)}`;
}
