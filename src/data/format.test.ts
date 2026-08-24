import { describe, expect, test } from "vite-plus/test";

import {
  BLANK,
  formatDuration,
  formatInteger,
  formatPassAt1,
  formatThroughput,
  formatTierDiscount,
  formatTokens,
  formatUsd,
} from "./format.ts";

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

describe("formatThroughput", () => {
  test("always renders one decimal", () => {
    expect(formatThroughput(58.75)).toBe("58.8");
    expect(formatThroughput(40)).toBe("40.0");
  });

  test("renders blank for null", () => {
    expect(formatThroughput(null)).toBe(BLANK);
  });
});

describe("formatDuration", () => {
  test("renders minutes and seconds", () => {
    expect(formatDuration(74)).toBe("1m 14s");
    expect(formatDuration(3482)).toBe("58m 2s");
  });

  test("keeps minutes past the hour instead of switching units", () => {
    expect(formatDuration(3850)).toBe("64m 10s");
  });

  test("renders sub-minute values with a zero minute", () => {
    expect(formatDuration(45)).toBe("0m 45s");
  });

  test("rounds to the nearest second", () => {
    expect(formatDuration(74.6)).toBe("1m 15s");
    expect(formatDuration(119.7)).toBe("2m 0s");
  });

  test("renders blank for null", () => {
    expect(formatDuration(null)).toBe(BLANK);
  });
});

describe("formatTierDiscount", () => {
  test("renders the factor as a percentage discount", () => {
    expect(formatTierDiscount(0.05)).toBe("−95%");
    expect(formatTierDiscount(0.1)).toBe("−90%");
  });

  test("keeps one decimal where rounding needs it", () => {
    expect(formatTierDiscount(0.025)).toBe("−97.5%");
    expect(formatTierDiscount(20 / 700)).toBe("−97.1%");
    expect(formatTierDiscount(200 / 14000)).toBe("−98.6%");
  });
});

describe("formatInteger", () => {
  test("rounds to a whole number", () => {
    expect(formatInteger(99.04)).toBe("99");
    expect(formatInteger(123.5)).toBe("124");
  });
});
