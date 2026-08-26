import { describe, expect, test } from "vite-plus/test";

import costAdjustments from "../../data/cost-adjustments.json" with { type: "json" };
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "./sources.ts";
import {
  ACCESS_ROUTE_ORDER,
  compareBlankLast,
  compareModel,
  costPerSolvedTask,
  deriveRows,
  subsidisationFactor,
} from "./derive.ts";
import type { LeaderboardRow, ThroughputSnapshot } from "./types.ts";

// Value-asserting throughput tests use this fixture rather than the live
// snapshot, so a data refresh never re-touches them; live-data tests below
// assert structure only.
const throughputFixture: ThroughputSnapshot = {
  source: "OpenRouter",
  sourceUrl: "https://openrouter.ai",
  capturedAt: "2026-01-01T00:00:00Z",
  models: {
    "anthropic/claude-opus-5": { consumerP50: 50 },
    "anthropic/claude-fable-5": { consumerP50: 42 },
  },
};

describe("deriveRows", () => {
  const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);

  test("expands every entry into an API row plus one row per family tier", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierCount = (family: string) => tiers.filter((tier) => tier.family === family).length;
    const expected = deepsweSnapshot.entries.reduce(
      (total, entry) => total + 1 + tierCount(familyOf.get(entry.model) ?? "none"),
      0,
    );
    expect(rows).toHaveLength(expected);
    // Literal spot-check so the count isn't purely self-confirming.
    expect(rows).toHaveLength(185);
    expect(rows.filter((row) => row.accessRoute === "api")).toHaveLength(
      deepsweSnapshot.entries.length,
    );
  });

  test("splits tier rows 63 Claude / 60 ChatGPT with the current data", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierRows = rows.filter((row) => row.accessRoute !== "api");
    expect(tierRows.filter((row) => familyOf.get(row.model) === "claude")).toHaveLength(63);
    expect(tierRows.filter((row) => familyOf.get(row.model) === "chatgpt")).toHaveLength(60);
  });

  test("family none models never get tier rows", () => {
    const noneModels = new Set(
      modelMapping
        .filter((entry) => entry.family === "none")
        .map((entry) => entry.leaderboardModel),
    );
    const noneRows = rows.filter((row) => noneModels.has(row.model));
    expect(noneRows.length).toBeGreaterThan(0);
    expect(noneRows.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("a family entry gets exactly its family's tiers as access routes", () => {
    const fable = rows.filter((row) => row.model === "claude-fable-5" && row.effort === "max");
    expect(fable.map((row) => row.accessRoute)).toEqual([
      "api",
      "claude-pro",
      "claude-max-5x",
      "claude-max-20x",
    ]);
  });

  const sourceEntry = (row: LeaderboardRow) =>
    deepsweSnapshot.entries.find((e) => e.model === row.model && e.effort === row.effort)!;

  test("claude-pro rows of standard Claude models use factor 0.05", () => {
    // 20 / 400 at the default usage multiplier.
    const proRows = rows.filter(
      (row) => row.accessRoute === "claude-pro" && row.model !== "claude-fable-5",
    );
    expect(proRows.length).toBeGreaterThan(0);
    for (const row of proRows) {
      expect(row.effectiveCostUsd).toBeCloseTo(sourceEntry(row).average_cost_usd * 0.05, 10);
    }
  });

  test("the usage multiplier scales the factor: Fable 5 claude-pro rows are 0.10", () => {
    // 20 / (400 × 0.5) = 0.10, not 0.05.
    const proRows = rows.filter(
      (row) => row.accessRoute === "claude-pro" && row.model === "claude-fable-5",
    );
    expect(proRows.length).toBeGreaterThan(0);
    for (const row of proRows) {
      expect(row.effectiveCostUsd).toBeCloseTo(sourceEntry(row).average_cost_usd * 0.1, 10);
    }
  });

  test("ChatGPT tier rows use their own tier figures", () => {
    // chatgpt-plus: 20 / 700.
    const entry = deepsweSnapshot.entries.find((e) => e.model === "gpt-5-5");
    const row = rows.find(
      (r) =>
        r.model === "gpt-5-5" && r.effort === entry?.effort && r.accessRoute === "chatgpt-plus",
    );
    expect(row?.effectiveCostUsd).toBeCloseTo(entry!.average_cost_usd * (20 / 700), 10);
  });

  test("tier rows carry the entry's API cost beside the effective cost", () => {
    const tierRows = rows.filter((row) => row.accessRoute !== "api");
    expect(tierRows.length).toBeGreaterThan(0);
    for (const row of tierRows) {
      expect(row.apiCostUsd).toBe(sourceEntry(row).average_cost_usd);
    }
  });

  test("API rows' API cost equals their effective cost", () => {
    const apiRows = rows.filter((row) => row.accessRoute === "api");
    expect(apiRows.length).toBeGreaterThan(0);
    for (const row of apiRows) {
      expect(row.apiCostUsd).toBe(row.effectiveCostUsd);
      expect(row.apiCostPerSolvedTaskUsd).toBe(row.costPerSolvedTaskUsd);
    }
  });

  test("a tier row's API cost per solved task matches its model's API row", () => {
    const tier = rows.find(
      (r) => r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "claude-pro",
    );
    const api = rows.find(
      (r) => r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "api",
    );
    expect(tier?.apiCostPerSolvedTaskUsd).toBe(api?.costPerSolvedTaskUsd);
  });

  test("cost per solved task recomputes from the row's effective cost", () => {
    const api = rows.find((r) => r.model === "claude-opus-5" && r.accessRoute === "api");
    const tier = rows.find(
      (r) =>
        r.model === "claude-opus-5" && r.effort === api?.effort && r.accessRoute === "claude-pro",
    );
    expect(tier?.costPerSolvedTaskUsd).toBeCloseTo(tier!.effectiveCostUsd / tier!.passAt1, 10);
    expect(tier?.costPerSolvedTaskUsd).not.toBe(api?.costPerSolvedTaskUsd);
  });

  test("every snapshot model is covered by the mapping", () => {
    const mapped = new Set(modelMapping.map((entry) => entry.leaderboardModel));
    for (const entry of deepsweSnapshot.entries) {
      expect(mapped, `missing mapping for ${entry.model}`).toContain(entry.model);
    }
  });

  test("rows carry mapping display names and families", () => {
    const opus = rows.find((row) => row.model === "claude-opus-5" && row.effort === "max");
    expect(opus?.displayName).toBe("Claude Opus 5");
    expect(opus?.vendor).toBe("Anthropic");
    expect(opus?.family).toBe("claude");
    expect(rows.find((row) => row.model === "kimi-k3")?.family).toBe("none");
  });

  test("Luna rows use display-adjusted costs, not raw source values", () => {
    const lunaFactor = costAdjustments.factors["gpt-5-6-luna"];
    expect(lunaFactor).toBeLessThan(1);
    const luna = deepsweSnapshot.entries.filter((entry) => entry.model === "gpt-5-6-luna");
    expect(luna.length).toBeGreaterThan(0);
    for (const entry of luna) {
      const row = rows.find((r) => r.model === entry.model && r.effort === entry.effort);
      expect(row?.effectiveCostUsd).toBe(entry.average_cost_usd);
      expect(row?.effectiveCostUsd).toBeCloseTo(entry.raw_average_cost_usd * lunaFactor, 10);
      expect(row?.effectiveCostUsd).not.toBe(entry.raw_average_cost_usd);
    }
  });

  test("throws when a leaderboard model is missing from the mapping", () => {
    const mapping = modelMapping.filter((entry) => entry.leaderboardModel !== "glm-5-3");
    expect(() => deriveRows(deepsweSnapshot, mapping, throughputSnapshot, tiers)).toThrowError(
      /glm-5-3/,
    );
  });

  test("a model's rows share one throughput figure across effort levels", () => {
    const opus = deriveRows(deepsweSnapshot, modelMapping, throughputFixture, tiers).filter(
      (row) => row.model === "claude-opus-5",
    );
    expect(opus.length).toBeGreaterThan(1);
    for (const row of opus) {
      expect(row.throughputTokPerSec).toBe(50);
    }
  });

  test("average time is output tokens over the model's consumer-endpoint throughput", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [{ ...deepsweSnapshot.entries[0], model: "claude-fable-5", output_tokens: 8400 }],
    };
    const [row] = deriveRows(snapshot, modelMapping, throughputFixture, tiers);
    expect(row.throughputTokPerSec).toBe(42);
    expect(row.averageTimeSeconds).toBe(200);
  });

  test("a null OpenRouter id blanks throughput and time", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "glm-5-3" ? { ...entry, openrouterId: null } : entry,
    );
    const glm = deriveRows(deepsweSnapshot, mapping, throughputSnapshot, tiers).filter(
      (row) => row.model === "glm-5-3",
    );
    expect(glm.length).toBeGreaterThan(0);
    for (const row of glm) {
      expect(row.throughputTokPerSec).toBeNull();
      expect(row.averageTimeSeconds).toBeNull();
    }
  });

  test("a model absent from the throughput snapshot blanks throughput and time", () => {
    const models = { ...throughputSnapshot.models };
    delete models["z-ai/glm-5.3"];
    const glm = deriveRows(
      deepsweSnapshot,
      modelMapping,
      { ...throughputSnapshot, models },
      tiers,
    ).filter((row) => row.model === "glm-5-3");
    expect(glm.length).toBeGreaterThan(0);
    for (const row of glm) {
      expect(row.throughputTokPerSec).toBeNull();
      expect(row.averageTimeSeconds).toBeNull();
    }
  });
});

describe("subsidisationFactor", () => {
  const claudePro = tiers.find((tier) => tier.id === "claude-pro")!;

  test("is tier price over equivalent API spend", () => {
    expect(subsidisationFactor(claudePro, 1)).toBeCloseTo(0.05, 10);
  });

  test("the usage multiplier scales the equivalent spend", () => {
    expect(subsidisationFactor(claudePro, 0.5)).toBeCloseTo(0.1, 10);
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
  const row = (
    displayName: string,
    effort: string | null,
    accessRoute: LeaderboardRow["accessRoute"] = "api",
  ): LeaderboardRow => ({
    model: displayName.toLowerCase(),
    displayName,
    vendor: "Test",
    family: "none",
    effort,
    accessRoute,
    passAt1: 0.5,
    effectiveCostUsd: 1,
    costPerSolvedTaskUsd: 2,
    apiCostUsd: 1,
    apiCostPerSolvedTaskUsd: 2,
    outputTokens: 100,
    steps: 10,
    openrouterId: "test/model",
    throughputTokPerSec: 50,
    averageTimeSeconds: 2,
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

  test("breaks effort ties by access route: API first, then tiers in tiers.json order", () => {
    const routes: LeaderboardRow["accessRoute"][] = [
      "claude-max-20x",
      "chatgpt-plus",
      "api",
      "claude-pro",
      "chatgpt-pro-20x",
      "claude-max-5x",
      "chatgpt-pro-5x",
    ];
    const sorted = routes.map((route) => row("A", "max", route)).toSorted(compareModel);
    expect(sorted.map((r) => r.accessRoute)).toEqual([
      "api",
      "claude-pro",
      "claude-max-5x",
      "claude-max-20x",
      "chatgpt-plus",
      "chatgpt-pro-5x",
      "chatgpt-pro-20x",
    ]);
  });

  test("the access-route order stays in sync with tiers.json", () => {
    expect(ACCESS_ROUTE_ORDER).toEqual(["api", ...tiers.map((tier) => tier.id)]);
  });

  test("tiers.json lists each family's tiers in ascending price order", () => {
    // The tiebreak spec is "tiers in ascending price order"; the sync test
    // above only pins file order, so this guards the price invariant behind it.
    for (const family of ["claude", "chatgpt"]) {
      const prices = tiers
        .filter((tier) => tier.family === family)
        .map((tier) => tier.priceUsdPerMonth);
      expect(prices).toEqual(prices.toSorted((a, b) => a - b));
    }
  });
});
