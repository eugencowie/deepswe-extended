// Pure normalization for the DeepSWE refresh: schemas, guard rails, and the
// snapshot shape live here so the fetch/write shell stays thin and testable.

import { z } from "zod";
import type { DeepsweEntry, DeepsweSnapshot, ModelMappingEntry } from "../src/data/types.ts";

export const origin = "https://deepswe.datacurve.ai";
export const benchmarkVersion = "v1.1";

// The site's retroactive repricing multipliers (docs/context.md: cost
// adjustment factor). No first-party JSON exposes these; a human re-checks the
// deployed bundle and edits this table during the version-bump workflow.
export const costAdjustmentFactors: Readonly<Record<string, number>> = {
  "gpt-5-6-luna": 0.2,
  "gpt-5-6-terra": 0.8,
  "gemini-3-6-flash": 0.5,
};

export const versionManifestSchema = z.object({
  latest: z.string(),
  versions: z.array(
    z.object({
      id: z.string(),
      data_path: z.string(),
      n_tasks: z.number().int().positive(),
      status: z.string(),
    }),
  ),
});

export type VersionManifest = z.infer<typeof versionManifestSchema>;

export const leaderboardArtifactSchema = z.object({
  scope: z.string(),
  unit: z.string(),
  generated_at: z.iso.datetime({ offset: true }),
  n_tasks_in_set: z.number().int().positive(),
  // The checked-in snapshot requires a job reference, so null is a hard error.
  latest_job: z.object({ name: z.string(), finished_at: z.string() }),
  rows: z.array(
    z.object({
      model: z.string().min(1),
      reasoning_effort: z.string().min(1).nullable(),
      config: z.string().min(1),
      pass_at_1: z.number().min(0).max(1),
      mean_cost_usd: z.number().nonnegative(),
      mean_output_tokens: z.number().nonnegative(),
      mean_agent_steps: z.number().nonnegative(),
      n_attempted: z.number().int().positive(),
    }),
  ),
});

export type LeaderboardArtifact = z.infer<typeof leaderboardArtifactSchema>;

export function pinnedVersion(manifest: VersionManifest) {
  const selected = manifest.versions.find(({ id }) => id === benchmarkVersion);
  if (!selected) {
    throw new Error(`DeepSWE version "${benchmarkVersion}" is missing from the version manifest.`);
  }
  return selected;
}

export function artifactUrl(manifest: VersionManifest): string {
  return `${origin}/artifacts/${pinnedVersion(manifest).data_path}/leaderboard-live.json`;
}

// Decides whether a fresh snapshot is worth writing. raw_sha256 and
// source_generated_at churn upstream without content changes, so they only
// ride along when something else changed.
export function hasMeaningfulChange(existing: DeepsweSnapshot, next: DeepsweSnapshot): boolean {
  const strip = ({ raw_sha256: _sha, source_generated_at: _at, ...rest }: DeepsweSnapshot) => rest;
  return JSON.stringify(strip(existing)) !== JSON.stringify(strip(next));
}

export function normalize(
  manifest: VersionManifest,
  artifact: LeaderboardArtifact,
  mapping: ModelMappingEntry[],
  rawSha256: string,
): { snapshot: DeepsweSnapshot; warnings: string[] } {
  const warnings: string[] = [];
  const selected = pinnedVersion(manifest);

  if (manifest.latest !== benchmarkVersion) {
    warnings.push(
      `New DeepSWE version available: ${manifest.latest}. Staying pinned to ${benchmarkVersion}; ` +
        `follow the spec's version-bump workflow before switching.`,
    );
  }
  if (artifact.n_tasks_in_set !== selected.n_tasks) {
    throw new Error(
      `Version manifest says ${selected.n_tasks} tasks but the leaderboard artifact says ` +
        `${artifact.n_tasks_in_set}; refusing to write a snapshot from disagreeing sources.`,
    );
  }

  const fetchedModels = new Set(artifact.rows.map((row) => row.model));
  const mappedModels = new Set(mapping.map((entry) => entry.leaderboardModel));

  const unmapped = [...fetchedModels].filter((model) => !mappedModels.has(model));
  if (unmapped.length > 0) {
    throw new Error(
      `Leaderboard model(s) missing from data/model-mapping.json: ${unmapped.join(", ")}. ` +
        `Add mapping entries (family, OpenRouter id, usage multiplier) before refreshing.`,
    );
  }
  const stale = [...mappedModels].filter((model) => !fetchedModels.has(model));
  if (stale.length > 0) {
    warnings.push(
      `Mapping entries with no leaderboard rows (model removed upstream?): ${stale.join(", ")}.`,
    );
  }
  const staleFactors = Object.keys(costAdjustmentFactors).filter(
    (model) => !fetchedModels.has(model),
  );
  if (staleFactors.length > 0) {
    warnings.push(`Cost adjustment factors with no leaderboard rows: ${staleFactors.join(", ")}.`);
  }

  const seenConfigs = new Set<string>();
  const entries: DeepsweEntry[] = artifact.rows.map((row) => {
    if (seenConfigs.has(row.config)) {
      throw new Error(`Duplicate configuration "${row.config}" in the leaderboard artifact.`);
    }
    seenConfigs.add(row.config);
    const factor = costAdjustmentFactors[row.model] ?? 1;
    return {
      model: row.model,
      effort: row.reasoning_effort,
      pass_at_1: row.pass_at_1,
      average_cost_usd: row.mean_cost_usd * factor,
      output_tokens: row.mean_output_tokens,
      steps: row.mean_agent_steps,
      source_config: row.config,
      n_scored_attempts: row.n_attempted,
      raw_average_cost_usd: row.mean_cost_usd,
      cost_adjustment_factor: factor,
    };
  });

  return {
    snapshot: {
      schema_version: 1,
      benchmark_version: benchmarkVersion,
      source_url: artifactUrl(manifest),
      source_generated_at: artifact.generated_at,
      source_latest_job: artifact.latest_job,
      n_tasks_in_set: artifact.n_tasks_in_set,
      source_scope: artifact.scope,
      source_unit: artifact.unit,
      raw_sha256: rawSha256,
      cost_adjustments: Object.entries(costAdjustmentFactors).map(([model, factor]) => ({
        model,
        factor,
      })),
      entries,
    },
    warnings,
  };
}
