// Shared data-shape types. Refresh scripts will import these too, so they
// describe the checked-in files completely, not just what the UI reads.

// Every data file carries this provenance pair: the human-facing citation
// whose URL the footer links (ticket 15). Distinct from the DeepSWE
// snapshot's `source_url`, which is the fetched artifact itself.
export type Provenance = {
  source: string;
  sourceUrl: string;
};

export type DeepsweSnapshot = Provenance & {
  schema_version: 1;
  benchmark_version: "v1.1";
  source_url: string;
  source_generated_at: string; // ISO timestamp from the artifact
  source_latest_job: { name: string; finished_at: string | null }; // null while the job is still running
  n_tasks_in_set: number;
  source_scope: string;
  source_unit: string;
  raw_sha256: string; // hash of the upstream artifact this was derived from
  cost_adjustments: { model: string; factor: number }[];
  entries: DeepsweEntry[];
};

export type DeepsweEntry = {
  model: string; // site model id, e.g. "claude-fable-5"
  effort: string | null; // null = model's default effort
  pass_at_1: number; // fraction 0..1
  average_cost_usd: number; // display-adjusted
  output_tokens: number; // per-attempt mean, includes reasoning tokens
  steps: number; // agent turns per attempt
  n_scored_attempts: number;
  source_config: string;
  raw_average_cost_usd: number;
  cost_adjustment_factor: number;
};

export type ThroughputSnapshot = Provenance & {
  capturedAt: string;
  // Keyed by OpenRouter model id; consumerP50 is tokens/sec, the p50 of the
  // vendor's consumer endpoint (ADR 0002). Models whose vendor runs no
  // consumer endpoint are absent, yielding blank throughput/time.
  models: Record<string, { consumerP50: number }>;
};

export type SubscriptionFamily = "claude" | "chatgpt" | "none";

export type ModelMappingEntry = {
  leaderboardModel: string;
  displayName: string;
  vendor: string;
  // Revision-pinned wherever OpenRouter has a pinned listing (ADR 0002);
  // null yields blank throughput/time (ticket 07).
  openrouterId: string | null;
  family: SubscriptionFamily;
  usageMultiplier: number;
  shortName?: string; // UI short label, falling back to displayName (ticket 12)
};

export type TierId =
  | "claude-pro"
  | "claude-max-5x"
  | "claude-max-20x"
  | "chatgpt-plus"
  | "chatgpt-pro-5x"
  | "chatgpt-pro-20x";

export type Tier = {
  id: TierId;
  family: Exclude<SubscriptionFamily, "none">;
  label: string;
  shortLabel: string; // UI tag text; explicit data, never derived from label
  priceUsdPerMonth: number;
  equivalentApiSpendUsdPerMonth: number;
};

export type TiersSnapshot = Provenance & {
  tiers: Tier[];
};

export type AccessRoute = "api" | TierId;

export type LeaderboardRow = {
  model: string;
  displayName: string;
  vendor: string;
  family: SubscriptionFamily;
  effort: string | null;
  accessRoute: AccessRoute;
  passAt1: number;
  effectiveCostUsd: number;
  costPerSolvedTaskUsd: number | null; // null when passAt1 is 0
  apiCostUsd: number; // the entry's average cost at API pricing; equals effectiveCostUsd on API rows
  apiCostPerSolvedTaskUsd: number | null; // apiCostUsd ÷ passAt1; null when passAt1 is 0
  outputTokens: number;
  steps: number;
  openrouterId: string | null; // shown in the model-name tooltip
  throughputTokPerSec: number | null; // null when unmapped or absent from the snapshot
  averageTimeSeconds: number | null; // null when throughput is null
};
