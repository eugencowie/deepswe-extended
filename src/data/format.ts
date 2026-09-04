export const BLANK = "–";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Standard two-decimal currency. Sub-cent values collapse to $0.01 or $0.00
// on purpose: tier rows produce tiny costs, and "effectively free" reads
// better than a string of leading zeros.
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

// Always one decimal, so a right-aligned column doesn't go ragged on whole
// numbers.
export function formatThroughput(value: number | null): string {
  if (value === null) return BLANK;
  return value.toFixed(1);
}

// Always "Xm Ys": minutes ride past 60 and sub-minute values keep the zero
// minute, so the column reads uniformly across its whole range.
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return BLANK;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function formatInteger(value: number): string {
  return `${Math.round(value)}`;
}

// A tier discount (0.95 for 95% off) as a percentage: one decimal where
// needed ("−95%", "−97.5%"), minus sign U+2212.
export function formatTierDiscount(discount: number): string {
  const percent = Math.round(discount * 1000) / 10;
  return `−${percent}%`;
}
