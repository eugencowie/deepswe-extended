export const BLANK = "–";

export function formatUsd(value: number | null): string {
  if (value === null) return BLANK;
  // Number() round-trips toPrecision's exponent notation back to plain digits.
  return `$${Number(value.toPrecision(3))}`;
}

export function formatPassAt1(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
