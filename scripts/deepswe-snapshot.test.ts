import { describe, expect, it } from "vite-plus/test";
import type { ModelMappingEntry } from "../src/data/types.ts";
import { type LeaderboardArtifact, type VersionManifest, normalize } from "./deepswe-snapshot.ts";

const manifest: VersionManifest = {
  latest: "v1.1",
  versions: [
    { id: "v1.1", data_path: "v1.1", n_tasks: 113, status: "stable" },
    { id: "v1", data_path: "v1", n_tasks: 113, status: "frozen" },
  ],
};

function row(model: string, overrides: Partial<LeaderboardArtifact["rows"][number]> = {}) {
  return {
    model,
    reasoning_effort: null,
    config: `mini_swe_agent_${model}`,
    pass_at_1: 0.5,
    mean_cost_usd: 2,
    mean_output_tokens: 50_000,
    mean_agent_steps: 60,
    n_attempted: 452,
    ...overrides,
  };
}

function artifact(rows: LeaderboardArtifact["rows"]): LeaderboardArtifact {
  return {
    scope: "scope",
    unit: "unit",
    generated_at: "2026-08-20T07:48:24.252395+00:00",
    n_tasks_in_set: 113,
    latest_job: { name: "job", finished_at: "2026-08-20T07:35:00" },
    rows,
  };
}

function mappingFor(models: string[]): ModelMappingEntry[] {
  return models.map((model) => ({
    leaderboardModel: model,
    displayName: model,
    vendor: "Vendor",
    openrouterId: null,
    family: "none",
    usageMultiplier: 1,
  }));
}

// Includes every cost-adjustment-factor model so the happy path has no
// stale-factor warnings.
const allModels = ["claude-opus-5", "gpt-5-6-luna", "gpt-5-6-terra", "gemini-3-6-flash"];

describe("normalize", () => {
  it("produces a pinned, warning-free snapshot from a clean artifact", () => {
    const { snapshot, warnings } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model))),
      mappingFor(allModels),
      "abc123",
    );
    expect(warnings).toEqual([]);
    expect(snapshot.benchmark_version).toBe("v1.1");
    expect(snapshot.source_url).toBe(
      "https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json",
    );
    expect(snapshot.raw_sha256).toBe("abc123");
    expect(snapshot.entries).toHaveLength(4);
  });

  it("applies cost adjustment factors and keeps raw values beside adjusted ones", () => {
    const { snapshot } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model, { mean_cost_usd: 2 }))),
      mappingFor(allModels),
      "abc123",
    );
    const byModel = new Map(snapshot.entries.map((entry) => [entry.model, entry]));
    expect(byModel.get("gpt-5-6-luna")).toMatchObject({
      average_cost_usd: 0.4,
      raw_average_cost_usd: 2,
      cost_adjustment_factor: 0.2,
    });
    expect(byModel.get("claude-opus-5")).toMatchObject({
      average_cost_usd: 2,
      raw_average_cost_usd: 2,
      cost_adjustment_factor: 1,
    });
    expect(snapshot.cost_adjustments).toEqual([
      { model: "gpt-5-6-luna", factor: 0.2 },
      { model: "gpt-5-6-terra", factor: 0.8 },
      { model: "gemini-3-6-flash", factor: 0.5 },
    ]);
  });

  it("warns without switching when the manifest's latest moves past the pin", () => {
    const { snapshot, warnings } = normalize(
      { ...manifest, latest: "v1.2" },
      artifact(allModels.map((model) => row(model))),
      mappingFor(allModels),
      "abc123",
    );
    expect(warnings).toEqual([expect.stringContaining("New DeepSWE version available: v1.2")]);
    expect(snapshot.benchmark_version).toBe("v1.1");
    expect(snapshot.source_url).toContain("/v1.1/");
  });

  it("fails when a fetched model is missing from the mapping, naming the model", () => {
    expect(() =>
      normalize(
        manifest,
        artifact([...allModels.map((model) => row(model)), row("new-model")]),
        mappingFor(allModels),
        "abc123",
      ),
    ).toThrow(/new-model.*model-mapping\.json|model-mapping\.json.*new-model/);
  });

  it("warns when a mapping entry has no leaderboard rows", () => {
    const { warnings } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model))),
      mappingFor([...allModels, "retired-model"]),
      "abc123",
    );
    expect(warnings).toEqual([expect.stringContaining("retired-model")]);
  });

  it("warns when a cost adjustment factor has no leaderboard rows", () => {
    const models = ["claude-opus-5", "gpt-5-6-luna", "gpt-5-6-terra"];
    const { warnings } = normalize(
      manifest,
      artifact(models.map((model) => row(model))),
      mappingFor(models),
      "abc123",
    );
    expect(warnings).toEqual([
      expect.stringContaining("Cost adjustment factors with no leaderboard rows: gemini-3-6-flash"),
    ]);
  });

  it("rejects duplicate configurations", () => {
    const duplicated = [row("claude-opus-5"), row("claude-opus-5", { pass_at_1: 0.6 })];
    expect(() =>
      normalize(manifest, artifact(duplicated), mappingFor(allModels), "abc123"),
    ).toThrow(/Duplicate configuration "mini_swe_agent_claude-opus-5"/);
  });

  it("rejects a task-count disagreement between manifest and artifact", () => {
    const disagreeing = { ...artifact(allModels.map((model) => row(model))), n_tasks_in_set: 99 };
    expect(() => normalize(manifest, disagreeing, mappingFor(allModels), "abc123")).toThrow(
      /113.*99/,
    );
  });
});
