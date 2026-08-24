import { describe, expect, test } from "vite-plus/test";

import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "./sources.ts";
import { deriveRows } from "./derive.ts";
import {
  defaultFilters,
  filterRows,
  type LeaderboardFilters,
  type SubscriptionSelection,
} from "./filter.ts";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);
const allModels = [...new Set(rows.map((row) => row.model))];
const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));

const filters = (overrides: Partial<LeaderboardFilters>): LeaderboardFilters => ({
  ...defaultFilters(allModels),
  ...overrides,
});

// Every access route ticked in both sections, as if the user checked all boxes.
const allRoutes: SubscriptionSelection = {
  claude: new Set(["api", ...tiers.filter((t) => t.family === "claude").map((t) => t.id)]),
  chatgpt: new Set(["api", ...tiers.filter((t) => t.family === "chatgpt").map((t) => t.id)]),
};

describe("defaultFilters", () => {
  test("shows one API row per model", () => {
    const visible = filterRows(rows, defaultFilters(allModels));
    expect(visible).toHaveLength(allModels.length);
    expect(visible).toHaveLength(25);
    expect(new Set(visible.map((row) => row.model)).size).toBe(visible.length);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });
});

describe("filterRows", () => {
  test("Best keeps the highest effort, not the best Pass@1", () => {
    // claude-fable-5's xhigh entry outscores max, but Best still shows max
    // (matching the DeepSWE site's Best view).
    const visible = filterRows(rows, defaultFilters(allModels));
    expect(visible.find((row) => row.model === "claude-fable-5")?.effort).toBe("max");
    expect(visible.find((row) => row.model === "grok-4-6")?.effort).toBe("xhigh");
  });

  test("Best keeps a single default-effort entry", () => {
    const visible = filterRows(rows, defaultFilters(allModels));
    expect(visible.find((row) => row.model === "kimi-k2-7-code")?.effort).toBeNull();
  });

  test("All effort levels with API only shows every entry once", () => {
    const visible = filterRows(rows, filters({ effortView: "all" }));
    expect(visible).toHaveLength(deepsweSnapshot.entries.length);
    expect(visible).toHaveLength(62);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("ticking a tier adds that family's tier rows alongside API rows", () => {
    const visible = filterRows(
      rows,
      filters({
        effortView: "all",
        subscriptions: {
          claude: new Set(["api", "claude-pro"]),
          chatgpt: new Set(["api"]),
        },
      }),
    );
    const claudeEntries = deepsweSnapshot.entries.filter(
      (entry) => familyOf.get(entry.model) === "claude",
    );
    expect(visible).toHaveLength(deepsweSnapshot.entries.length + claudeEntries.length);
    expect(visible.filter((row) => row.accessRoute === "claude-pro")).toHaveLength(
      claudeEntries.length,
    );
  });

  test("unticking a family's API keeps its tier rows and other families' API rows", () => {
    const visible = filterRows(
      rows,
      filters({
        effortView: "all",
        subscriptions: {
          claude: new Set(["claude-max-20x"]),
          chatgpt: new Set(["api"]),
        },
      }),
    );
    const claudeRows = visible.filter((row) => row.family === "claude");
    expect(claudeRows.length).toBeGreaterThan(0);
    expect(claudeRows.every((row) => row.accessRoute === "claude-max-20x")).toBe(true);
    expect(visible.some((row) => row.family === "chatgpt" && row.accessRoute === "api")).toBe(true);
    expect(visible.some((row) => row.family === "none")).toBe(true);
  });

  test("family-none rows ignore the subscription selection entirely", () => {
    const visible = filterRows(
      rows,
      filters({
        effortView: "all",
        subscriptions: { claude: new Set(), chatgpt: new Set() },
      }),
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((row) => row.family === "none")).toBe(true);
  });

  test("unticking a model removes all its rows across efforts and routes", () => {
    const models = new Set(allModels.filter((model) => model !== "claude-fable-5"));
    const visible = filterRows(
      rows,
      filters({ effortView: "all", subscriptions: allRoutes, models }),
    );
    expect(visible.some((row) => row.model === "claude-fable-5")).toBe(false);
    expect(visible).toHaveLength(
      rows.length - rows.filter((row) => row.model === "claude-fable-5").length,
    );
  });

  test("an empty model selection shows nothing", () => {
    expect(filterRows(rows, filters({ models: new Set() }))).toHaveLength(0);
  });

  test("all routes ticked in All view shows every derived row", () => {
    const visible = filterRows(rows, filters({ effortView: "all", subscriptions: allRoutes }));
    expect(visible).toHaveLength(rows.length);
  });
});
