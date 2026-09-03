// Pure normalization for the DeepSWE refresh: schemas, guard rails, and the
// snapshot shape live here so the fetch/write shell stays thin and testable.

import { z } from "zod";
import type { DeepsweEntry, DeepsweSnapshot, ModelMappingEntry } from "../src/data/types.ts";

export const origin = "https://deepswe.datacurve.ai";
export const benchmarkVersion = "v1.1";

// The site's retroactive repricing multipliers (docs/context.md: cost
// adjustment factor) live in data/cost-adjustments.json; no first-party JSON
// exposes them, so a human re-checks the deployed bundle and edits that file
// during the version-bump workflow (ticket 15 reversed ticket 10's inline
// constant). The shell loads it with this schema and passes factors in.
export const costAdjustmentsSchema = z.object({
  source: z.string().min(1),
  sourceUrl: z.url(),
  factors: z.record(z.string().min(1), z.number().positive()),
});

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
  // finished_at is null while the upstream job is still running; DeepSWE shows
  // those rows anyway, so we snapshot them too (ticket 17). An absent job
  // object stays a hard error: that state has never been observed.
  latest_job: z.object({ name: z.string(), finished_at: z.string().nullable() }),
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

// Decides whether a fresh snapshot is worth writing. raw_sha256,
// source_generated_at, and source_latest_job churn upstream without content
// changes (nothing the app consumes reads them), so they only ride along when
// something else changed.
export function hasMeaningfulChange(existing: DeepsweSnapshot, next: DeepsweSnapshot): boolean {
  const strip = ({
    raw_sha256: _sha,
    source_generated_at: _at,
    source_latest_job: _job,
    ...rest
  }: DeepsweSnapshot) => rest;
  return JSON.stringify(strip(existing)) !== JSON.stringify(strip(next));
}

// The set difference the mapping guard and the entry generator both need:
// models the artifact reports that the mapping doesn't cover.
export function unmappedModels(rows: { model: string }[], mapping: ModelMappingEntry[]): string[] {
  const mapped = new Set(mapping.map((entry) => entry.leaderboardModel));
  return [...new Set(rows.map((row) => row.model))].filter((model) => !mapped.has(model));
}

export function normalize(
  manifest: VersionManifest,
  artifact: LeaderboardArtifact,
  mapping: ModelMappingEntry[],
  costAdjustmentFactors: Readonly<Record<string, number>>,
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

  const unmapped = unmappedModels(artifact.rows, mapping);
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
      source: "DeepSWE leaderboard",
      sourceUrl: origin,
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

// The Refresh PR body's before/after summary (ADR 0004): count drift is
// acknowledged in review, not by test literals, so the reviewer must see it.
// The heading names the source because the body also carries the OpenRouter
// summary (ticket 21).
export function summarizeRefresh(input: {
  existing: DeepsweSnapshot | null;
  snapshot: DeepsweSnapshot;
  mappingCount: number;
  generated: ModelMappingEntry[];
  changed: boolean;
}): string {
  const { existing, snapshot, mappingCount, generated, changed } = input;
  const modelCount = (s: DeepsweSnapshot) => new Set(s.entries.map((entry) => entry.model)).size;
  const lines = [
    "### DeepSWE data summary",
    "",
    "| Measure | Before | After |",
    "| --- | ---: | ---: |",
    `| Leaderboard entries | ${existing?.entries.length ?? "—"} | ${snapshot.entries.length} |`,
    `| Models | ${existing ? modelCount(existing) : "—"} | ${modelCount(snapshot)} |`,
    `| Mapping entries | ${mappingCount} | ${mappingCount + generated.length} |`,
  ];
  if (!changed) {
    // Equal counts alone cannot distinguish an untouched snapshot from a
    // changed one of the same size, and the Refresh PR opens every week
    // regardless because the OpenRouter half always changes.
    lines.push("", "No content change: the snapshot was left untouched this run.");
  }
  if (generated.length > 0) {
    lines.push(
      "",
      `Generated mapping entries: ${generated.map((entry) => entry.leaderboardModel).join(", ")}.`,
    );
  }
  return lines.join("\n");
}
