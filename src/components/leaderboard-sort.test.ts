import { describe, expect, test } from "vite-plus/test";

import { compareBlankLast } from "./leaderboard-sort.ts";

describe("compareBlankLast", () => {
  const values = [3, null, 1, 2];

  test("sorts blanks last ascending", () => {
    expect(values.toSorted((a, b) => compareBlankLast(a, b, "asc"))).toEqual([1, 2, 3, null]);
  });

  test("sorts blanks last descending", () => {
    expect(values.toSorted((a, b) => compareBlankLast(a, b, "desc"))).toEqual([3, 2, 1, null]);
  });
});
