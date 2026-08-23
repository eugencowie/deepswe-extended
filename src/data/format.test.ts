import { describe, expect, test } from "vite-plus/test";

import { BLANK, formatInteger, formatPassAt1, formatUsd } from "./format.ts";

describe("formatUsd", () => {
  test("renders three significant figures", () => {
    expect(formatUsd(4.3333)).toBe("$4.33");
    expect(formatUsd(0.08664)).toBe("$0.0866");
    expect(formatUsd(0.0061889)).toBe("$0.00619");
  });

  test("does not fall back to exponent notation for large values", () => {
    expect(formatUsd(1183.7)).toBe("$1180");
  });

  test("renders blank for null", () => {
    expect(formatUsd(null)).toBe(BLANK);
  });
});

describe("formatPassAt1", () => {
  test("renders a one-decimal percent", () => {
    expect(formatPassAt1(0.7364864)).toBe("73.6%");
    expect(formatPassAt1(0.7)).toBe("70.0%");
  });
});

describe("formatInteger", () => {
  test("rounds to a whole number with thousands separators", () => {
    expect(formatInteger(117565.69)).toBe("117,566");
    expect(formatInteger(99.04)).toBe("99");
  });
});
