import { describe, expect, test } from "vite-plus/test";

import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "./sources.ts";
import { deriveRows } from "./derive.ts";
import { defaultFilters, filterRows, type LeaderboardFilters } from "./filter.ts";
import type { AccessRoute } from "./types.ts";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);
const allModels = [...new Set(rows.map((row) => row.model))];

const filters = (overrides: Partial<LeaderboardFilters>): LeaderboardFilters => ({
  ...defaultFilters(allModels),
  ...overrides,
});

const familyRoutes = (family: "claude" | "chatgpt"): AccessRoute[] => [
  "api",
  ...tiers.filter((tier) => tier.family === family).map((tier) => tier.id),
];

describe("defaultFilters", () => {
  test("shows one API row per model", () => {
    const visible = filterRows(rows, defaultFilters(allModels));
    // Counts assert relationships, never snapshot-size literals; drift checks
    // moved to the load-time schema and PR review (ADR 0004).
    expect(visible).toHaveLength(allModels.length);
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
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("picking a tier replaces that family's API rows and touches nothing else", () => {
    const visible = filterRows(
      rows,
      filters({
        effortView: "all",
        subscriptions: { claude: "claude-pro", chatgpt: "api" },
      }),
    );
    expect(visible).toHaveLength(deepsweSnapshot.entries.length);
    const claudeRows = visible.filter((row) => row.family === "claude");
    expect(claudeRows.length).toBeGreaterThan(0);
    expect(claudeRows.every((row) => row.accessRoute === "claude-pro")).toBe(true);
    expect(visible.some((row) => row.family === "chatgpt" && row.accessRoute === "api")).toBe(true);
  });

  test("family-none rows stay on API under any selection", () => {
    const visible = filterRows(
      rows,
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
        expect(filterRows(rows, filters({ effortView: "all", subscriptions }))).toHaveLength(
          deepsweSnapshot.entries.length,
        );
        expect(filterRows(rows, filters({ subscriptions }))).toHaveLength(allModels.length);
      }
    }
  });

  test("unticking a model removes all its rows across efforts and routes", () => {
    const models = new Set(allModels.filter((model) => model !== "claude-fable-5"));
    const visible = filterRows(
      rows,
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
  });

  test("an empty model selection shows nothing", () => {
    expect(filterRows(rows, filters({ models: new Set() }))).toHaveLength(0);
  });
});
