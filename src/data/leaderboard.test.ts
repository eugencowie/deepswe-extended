import { describe, expect, test } from "vite-plus/test";

import costAdjustments from "../../data/cost-adjustments.json" with { type: "json" };
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "./sources.ts";
import {
  createLeaderboard,
  setEffortView,
  setModels,
  setRoute,
  toggleModel,
  type LeaderboardFilters,
  type LeaderboardRow,
} from "./leaderboard.ts";
import type { AccessRoute, ThroughputSnapshot } from "./types.ts";

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

const live = () => createLeaderboard(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);

describe("rows", () => {
  const { rows } = live();
  const sourceEntry = (row: { model: string; effort: string | null }) =>
    deepsweSnapshot.entries.find((e) => e.model === row.model && e.effort === row.effort)!;

  test("expands every entry into an API row plus one row per family tier", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierCount = (family: string) => tiers.filter((tier) => tier.family === family).length;
    const expected = deepsweSnapshot.entries.reduce(
      (total, entry) => total + 1 + tierCount(familyOf.get(entry.model) ?? "none"),
      0,
    );
    expect(rows).toHaveLength(expected);
    // No literal count here: snapshot-size drift checks moved to the
    // load-time schema and PR review (ADR 0004).
    expect(rows.filter((row) => row.accessRoute === "api")).toHaveLength(
      deepsweSnapshot.entries.length,
    );
  });

  test("every tier row uses one of its own mapping family's tiers", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierFamily = new Map<string, string>(tiers.map((tier) => [tier.id, tier.family]));
    const tierRows = rows.filter((row) => row.accessRoute !== "api");
    expect(tierRows.length).toBeGreaterThan(0);
    for (const row of tierRows) {
      // Cross-checked against the mapping, not just the row's own family, so
      // a row-derivation bug assigning the wrong family cannot self-confirm.
      expect(row.family).toBe(familyOf.get(row.model));
      expect(tierFamily.get(row.accessRoute)).toBe(row.family);
    }
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

  test("cost per solved task is blank when Pass@1 is 0", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [{ ...deepsweSnapshot.entries[0], model: "claude-fable-5", pass_at_1: 0 }],
    };
    const [row] = createLeaderboard(snapshot, modelMapping, throughputFixture, tiers).rows;
    expect(row.costPerSolvedTaskUsd).toBeNull();
    expect(row.apiCostPerSolvedTaskUsd).toBeNull();
  });

  test("rows carry mapping display names and families", () => {
    const opus = rows.find((row) => row.model === "claude-opus-5" && row.effort === "max");
    expect(opus?.displayName).toBe("Claude Opus 5");
    expect(opus?.vendor).toBe("Anthropic");
    expect(opus?.family).toBe("claude");
    expect(rows.find((row) => row.model === "kimi-k3")?.family).toBe("none");
  });

  test("Luna rows use cost-adjusted costs, not raw source values", () => {
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
    expect(() => createLeaderboard(deepsweSnapshot, mapping, throughputSnapshot, tiers)).toThrow(
      /glm-5-3/,
    );
  });

  test("a model's rows share one throughput figure across effort levels", () => {
    const opus = createLeaderboard(
      deepsweSnapshot,
      modelMapping,
      throughputFixture,
      tiers,
    ).rows.filter((row) => row.model === "claude-opus-5");
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
    const [row] = createLeaderboard(snapshot, modelMapping, throughputFixture, tiers).rows;
    expect(row.throughputTokPerSec).toBe(42);
    expect(row.averageTimeSeconds).toBe(200);
  });

  test("a null OpenRouter id blanks throughput and time", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "glm-5-3" ? { ...entry, openrouterId: null } : entry,
    );
    const glm = createLeaderboard(deepsweSnapshot, mapping, throughputSnapshot, tiers).rows.filter(
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
    const glm = createLeaderboard(
      deepsweSnapshot,
      modelMapping,
      { ...throughputSnapshot, models },
      tiers,
    ).rows.filter((row) => row.model === "glm-5-3");
    expect(glm.length).toBeGreaterThan(0);
    for (const row of glm) {
      expect(row.throughputTokPerSec).toBeNull();
      expect(row.averageTimeSeconds).toBeNull();
    }
  });
});

describe("access tags", () => {
  const { rows } = live();

  test("tier rows carry their tier's short label and family", () => {
    const row = rows.find(
      (r) =>
        r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "claude-max-20x",
    );
    expect(row?.accessTag).toEqual({ label: "Max 20x", family: "claude" });
    const plus = rows.find((r) => r.model === "gpt-5-5" && r.accessRoute === "chatgpt-plus");
    expect(plus?.accessTag).toEqual({ label: "Plus", family: "chatgpt" });
  });

  test("API rows are untagged", () => {
    const apiRows = rows.filter((row) => row.accessRoute === "api");
    expect(apiRows.length).toBeGreaterThan(0);
    expect(apiRows.every((row) => row.accessTag === null)).toBe(true);
  });
});

describe("modelOptions", () => {
  test("lists each model once, sorted by display name", () => {
    const { modelOptions } = live();
    const models = modelOptions.map((option) => option.model);
    expect(new Set(models).size).toBe(models.length);
    expect(new Set(models)).toEqual(new Set(deepsweSnapshot.entries.map((entry) => entry.model)));
    const names = modelOptions.map((option) => option.displayName);
    expect(names).toEqual(names.toSorted((a, b) => a.localeCompare(b, "en")));
  });

  test("uses the mapping's display name", () => {
    const { modelOptions } = live();
    expect(modelOptions.find((option) => option.model === "claude-opus-5")?.displayName).toBe(
      "Claude Opus 5",
    );
  });
});

describe("pickerFamilies", () => {
  const { pickerFamilies } = live();
  const family = (id: "claude" | "chatgpt") => pickerFamilies.find((f) => f.family === id)!;

  test("lists both families, Claude first, with their tiers in tiers.json order", () => {
    expect(pickerFamilies.map((f) => f.family)).toEqual(["claude", "chatgpt"]);
    expect(family("claude").tiers.map((tier) => tier.id)).toEqual([
      "claude-pro",
      "claude-max-5x",
      "claude-max-20x",
    ]);
    expect(family("chatgpt").tiers.map((tier) => tier.id)).toEqual([
      "chatgpt-plus",
      "chatgpt-pro-5x",
      "chatgpt-pro-20x",
    ]);
  });

  test("each tier carries its short label and tier-wide discount", () => {
    // claude-pro: 1 − 20/400 = 0.95; claude-max-20x: 1 − 200/8000 = 0.975.
    const pro = family("claude").tiers.find((tier) => tier.id === "claude-pro");
    expect(pro?.shortLabel).toBe("Pro");
    expect(pro?.tierDiscount).toBeCloseTo(0.95, 10);
    const max20 = family("claude").tiers.find((tier) => tier.id === "claude-max-20x");
    expect(max20?.tierDiscount).toBeCloseTo(0.975, 10);
  });

  test("models with non-standard usage limits get their own note per tier", () => {
    // Fable 5 at multiplier 0.5: 1 − 20/(400 × 0.5) = 0.90 on Pro,
    // 1 − 200/(8000 × 0.5) = 0.95 on Max 20x.
    const pro = family("claude").tiers.find((tier) => tier.id === "claude-pro");
    expect(pro?.notes).toEqual([{ name: "Fable", tierDiscount: expect.closeTo(0.9, 10) }]);
    const max20 = family("claude").tiers.find((tier) => tier.id === "claude-max-20x");
    expect(max20?.notes).toEqual([{ name: "Fable", tierDiscount: expect.closeTo(0.95, 10) }]);
  });

  test("standard-limit families have no notes", () => {
    for (const tier of family("chatgpt").tiers) {
      expect(tier.notes).toEqual([]);
    }
  });

  test("a note uses the mapping's short name, falling back to the display name", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "gpt-5-5"
        ? { ...entry, usageMultiplier: 2, shortName: undefined }
        : entry,
    );
    const { pickerFamilies } = createLeaderboard(
      deepsweSnapshot,
      mapping,
      throughputSnapshot,
      tiers,
    );
    const plus = pickerFamilies
      .find((f) => f.family === "chatgpt")!
      .tiers.find((tier) => tier.id === "chatgpt-plus");
    // 1 − 20/(700 × 2)
    expect(plus?.notes).toEqual([
      { name: "GPT-5.5", tierDiscount: expect.closeTo(1 - 20 / 1400, 10) },
    ]);
  });
});

describe("visibleRows", () => {
  const leaderboard = live();
  const { rows, modelOptions } = leaderboard;
  const filters = (overrides: Partial<LeaderboardFilters>): LeaderboardFilters => ({
    ...leaderboard.defaultFilters(),
    ...overrides,
  });
  const familyRoutes = (family: "claude" | "chatgpt"): AccessRoute[] => [
    "api",
    ...tiers.filter((tier) => tier.family === family).map((tier) => tier.id),
  ];

  test("the default view shows one API row per model", () => {
    const visible = leaderboard.visibleRows(leaderboard.defaultFilters());
    // Counts assert relationships, never snapshot-size literals; drift checks
    // moved to the load-time schema and PR review (ADR 0004).
    expect(visible).toHaveLength(modelOptions.length);
    expect(new Set(visible.map((row) => row.model)).size).toBe(visible.length);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("Best keeps the highest effort, not the best Pass@1", () => {
    // claude-fable-5's xhigh entry outscores max, but Best still shows max
    // (matching the DeepSWE site's Best view).
    const visible = leaderboard.visibleRows(leaderboard.defaultFilters());
    expect(visible.find((row) => row.model === "claude-fable-5")?.effort).toBe("max");
    expect(visible.find((row) => row.model === "grok-4-6")?.effort).toBe("xhigh");
  });

  test("Best keeps a single default-effort entry", () => {
    const visible = leaderboard.visibleRows(leaderboard.defaultFilters());
    expect(visible.find((row) => row.model === "kimi-k2-7-code")?.effort).toBeNull();
  });

  test("All effort levels with API only shows every entry once", () => {
    const visible = leaderboard.visibleRows(filters({ effortView: "all" }));
    expect(visible).toHaveLength(deepsweSnapshot.entries.length);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("picking a tier replaces that family's API rows and touches nothing else", () => {
    const visible = leaderboard.visibleRows(
      filters({ effortView: "all", subscriptions: { claude: "claude-pro", chatgpt: "api" } }),
    );
    expect(visible).toHaveLength(deepsweSnapshot.entries.length);
    const claudeRows = visible.filter((row) => row.family === "claude");
    expect(claudeRows.length).toBeGreaterThan(0);
    expect(claudeRows.every((row) => row.accessRoute === "claude-pro")).toBe(true);
    expect(visible.some((row) => row.family === "chatgpt" && row.accessRoute === "api")).toBe(true);
  });

  test("family-none rows stay on API under any selection", () => {
    const visible = leaderboard.visibleRows(
      filters({
        effortView: "all",
        subscriptions: { claude: "claude-max-20x", chatgpt: "chatgpt-pro-20x" },
      }),
    );
    const noneRows = visible.filter((row) => row.family === "none");
    expect(noneRows.length).toBeGreaterThan(0);
    expect(noneRows.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("the picker changes pricing, never row count", () => {
    // Exactly one route per family means every entry appears on exactly one
    // row: every entry in the All view and one per model in Best, whatever
    // the picker says.
    for (const claude of familyRoutes("claude")) {
      for (const chatgpt of familyRoutes("chatgpt")) {
        const subscriptions = { claude, chatgpt };
        expect(leaderboard.visibleRows(filters({ effortView: "all", subscriptions }))).toHaveLength(
          deepsweSnapshot.entries.length,
        );
        expect(leaderboard.visibleRows(filters({ subscriptions }))).toHaveLength(
          modelOptions.length,
        );
      }
    }
  });

  test("unticking a model removes all its rows across efforts and routes", () => {
    const models = new Set(
      modelOptions.map(({ model }) => model).filter((model) => model !== "claude-fable-5"),
    );
    const visible = leaderboard.visibleRows(
      filters({
        effortView: "all",
        subscriptions: { claude: "claude-pro", chatgpt: "api" },
        models,
      }),
    );
    const fableEntries = deepsweSnapshot.entries.filter(
      (entry) => entry.model === "claude-fable-5",
    );
    expect(visible.some((row) => row.model === "claude-fable-5")).toBe(false);
    expect(visible).toHaveLength(deepsweSnapshot.entries.length - fableEntries.length);
    expect(rows.length).toBeGreaterThan(visible.length);
  });

  test("an empty model selection shows nothing", () => {
    expect(leaderboard.visibleRows(filters({ models: new Set() }))).toHaveLength(0);
  });
});

describe("filter transitions", () => {
  const leaderboard = live();
  const initial = leaderboard.defaultFilters();

  test("toggleModel removes a selected model and re-adds an unselected one", () => {
    const without = toggleModel(initial, "claude-fable-5");
    expect(without.models.has("claude-fable-5")).toBe(false);
    expect(without.models.size).toBe(initial.models.size - 1);
    const again = toggleModel(without, "claude-fable-5");
    expect(again.models.has("claude-fable-5")).toBe(true);
    expect(again.models.size).toBe(initial.models.size);
  });

  test("transitions never mutate their input", () => {
    const before = new Set(initial.models);
    toggleModel(initial, "claude-fable-5");
    setModels(initial, new Set());
    setRoute(initial, "claude", "claude-pro");
    setEffortView(initial, "all");
    expect(initial.models).toEqual(before);
    expect(initial.subscriptions).toEqual({ claude: "api", chatgpt: "api" });
    expect(initial.effortView).toBe("best");
  });

  test("setRoute changes one family's route and leaves the other alone", () => {
    const picked = setRoute(
      setRoute(initial, "claude", "claude-max-5x"),
      "chatgpt",
      "chatgpt-plus",
    );
    expect(picked.subscriptions).toEqual({ claude: "claude-max-5x", chatgpt: "chatgpt-plus" });
    expect(setRoute(picked, "claude", "api").subscriptions).toEqual({
      claude: "api",
      chatgpt: "chatgpt-plus",
    });
  });

  test("setEffortView and setModels replace only their field", () => {
    const all = setEffortView(initial, "all");
    expect(all.effortView).toBe("all");
    expect(all.models).toBe(initial.models);
    const none = setModels(all, new Set());
    expect(none.models.size).toBe(0);
    expect(none.effortView).toBe("all");
  });
});

describe("compareModel", () => {
  const row = (
    displayName: string,
    effort: string | null,
    accessRoute: AccessRoute = "api",
  ): LeaderboardRow => ({
    model: displayName.toLowerCase(),
    displayName,
    vendor: "Test",
    family: "none",
    effort,
    accessRoute,
    accessTag: null,
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
  const { compareModel } = live();

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
    const routes: AccessRoute[] = [
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

  test("the route order follows the tiers it was built with, not a constant", () => {
    const reversed = createLeaderboard(
      deepsweSnapshot,
      modelMapping,
      throughputSnapshot,
      tiers.toReversed(),
    );
    const routes: AccessRoute[] = ["claude-pro", "api", "chatgpt-pro-20x"];
    const sorted = routes.map((route) => row("A", "max", route)).toSorted(reversed.compareModel);
    expect(sorted.map((r) => r.accessRoute)).toEqual(["api", "chatgpt-pro-20x", "claude-pro"]);
  });

  test("tiers.json lists each family's tiers in ascending price order", () => {
    // The tiebreak spec is "tiers in ascending price order"; the route order
    // follows file order, so this guards the price invariant behind it.
    for (const family of ["claude", "chatgpt"]) {
      const prices = tiers
        .filter((tier) => tier.family === family)
        .map((tier) => tier.priceUsdPerMonth);
      expect(prices).toEqual(prices.toSorted((a, b) => a - b));
    }
  });
});
