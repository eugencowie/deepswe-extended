import { describe, expect, test } from "vite-plus/test";

import { deepsweSnapshot, modelMapping } from "./sources.ts";
import { compareBlankLast, compareModel, costPerSolvedTask, deriveRows } from "./derive.ts";
import type { LeaderboardRow } from "./types.ts";

describe("deriveRows", () => {
  const rows = deriveRows(deepsweSnapshot, modelMapping);

  test("emits one API row per snapshot entry", () => {
    expect(rows).toHaveLength(62);
    expect(rows.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("every snapshot model is covered by the mapping", () => {
    const mapped = new Set(modelMapping.map((entry) => entry.leaderboardModel));
    for (const entry of deepsweSnapshot.entries) {
      expect(mapped, `missing mapping for ${entry.model}`).toContain(entry.model);
    }
  });

  test("rows carry mapping display names", () => {
    const opus = rows.find((row) => row.model === "claude-opus-5" && row.effort === "max");
    expect(opus?.displayName).toBe("Claude Opus 5");
    expect(opus?.vendor).toBe("Anthropic");
  });

  test("Luna rows use display-adjusted costs, not raw source values", () => {
    const luna = deepsweSnapshot.entries.filter((entry) => entry.model === "gpt-5-6-luna");
    expect(luna.length).toBeGreaterThan(0);
    for (const entry of luna) {
      const row = rows.find((r) => r.model === entry.model && r.effort === entry.effort);
      expect(row?.effectiveCostUsd).toBe(entry.average_cost_usd);
      expect(row?.effectiveCostUsd).toBeCloseTo(entry.raw_average_cost_usd * 0.2, 10);
      expect(row?.effectiveCostUsd).not.toBe(entry.raw_average_cost_usd);
    }
  });

  test("throws when a leaderboard model is missing from the mapping", () => {
    const mapping = modelMapping.filter((entry) => entry.leaderboardModel !== "glm-5-3");
    expect(() => deriveRows(deepsweSnapshot, mapping)).toThrowError(/glm-5-3/);
  });
});

describe("costPerSolvedTask", () => {
  test("divides effective cost by pass@1", () => {
    expect(costPerSolvedTask(4, 0.75)).toBeCloseTo(5.3333, 4);
  });

  test("is null when pass@1 is 0", () => {
    expect(costPerSolvedTask(4, 0)).toBeNull();
  });
});

describe("compareBlankLast", () => {
  const values = [3, null, 1, 2];

  test("sorts blanks last ascending", () => {
    expect(values.toSorted((a, b) => compareBlankLast(a, b, "asc"))).toEqual([1, 2, 3, null]);
  });

  test("sorts blanks last descending", () => {
    expect(values.toSorted((a, b) => compareBlankLast(a, b, "desc"))).toEqual([3, 2, 1, null]);
  });
});

describe("compareModel", () => {
  const row = (displayName: string, effort: string | null): LeaderboardRow => ({
    model: displayName.toLowerCase(),
    displayName,
    vendor: "Test",
    effort,
    accessRoute: "api",
    passAt1: 0.5,
    effectiveCostUsd: 1,
    costPerSolvedTaskUsd: 2,
    outputTokens: 100,
    steps: 10,
  });

  test("sorts by display name first", () => {
    const sorted = [row("B", null), row("A", "max")].toSorted(compareModel);
    expect(sorted.map((r) => r.displayName)).toEqual(["A", "B"]);
  });

  test("breaks ties by semantic effort order, default first", () => {
    const efforts = ["max", "high", null, "xhigh", "low", "medium"];
    const sorted = efforts.map((effort) => row("A", effort)).toSorted(compareModel);
    expect(sorted.map((r) => r.effort)).toEqual([null, "low", "medium", "high", "xhigh", "max"]);
  });
});
