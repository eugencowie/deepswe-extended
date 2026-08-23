import { describe, expect, test } from "vite-plus/test";

import { BLANK, formatInteger, formatPassAt1, formatTokens, formatUsd } from "./format.ts";

describe("formatUsd", () => {
  test("renders standard two-decimal currency", () => {
    expect(formatUsd(11.8375)).toBe("$11.84");
    expect(formatUsd(0.6064)).toBe("$0.61");
    expect(formatUsd(1183.7)).toBe("$1,183.70");
  });

  test("collapses near-zero values instead of showing extra precision", () => {
    expect(formatUsd(0.0061889)).toBe("$0.01");
    expect(formatUsd(0.004)).toBe("$0.00");
  });

  test("renders blank for null", () => {
    expect(formatUsd(null)).toBe(BLANK);
  });
});

describe("formatPassAt1", () => {
  test("renders a whole percent", () => {
    expect(formatPassAt1(0.7364864)).toBe("74%");
    expect(formatPassAt1(0.728)).toBe("73%");
  });
});

describe("formatTokens", () => {
  test("renders thousands with a k suffix", () => {
    expect(formatTokens(117565.69)).toBe("118k");
    expect(formatTokens(3128)).toBe("3k");
  });
});

describe("formatInteger", () => {
  test("rounds to a whole number", () => {
    expect(formatInteger(99.04)).toBe("99");
    expect(formatInteger(123.5)).toBe("124");
  });
});
