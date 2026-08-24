// Shared data-shape types. Refresh scripts will import these too, so they
// describe the checked-in files completely, not just what the UI reads.

export type DeepsweSnapshot = {
  schema_version: 1;
  benchmark_version: "v1.1";
  source_url: string;
  source_generated_at: string; // ISO timestamp from the artifact
  source_latest_job: { name: string; finished_at: string };
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

export type ThroughputSnapshot = {
  capturedAt: string;
  // Keyed by OpenRouter model id; medianP50 is tokens/sec, the median across
  // default-tier endpoints' p50 throughput.
  models: Record<string, { medianP50: number }>;
};

export type SubscriptionFamily = "claude" | "chatgpt" | "none";

export type ModelMappingEntry = {
  leaderboardModel: string;
  displayName: string;
  vendor: string;
  openrouterId: string | null; // null yields blank throughput/time (ticket 07)
  family: SubscriptionFamily;
  usageMultiplier: number;
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

export type TiersSnapshot = {
  source: string;
  tiers: Tier[];
};

export type AccessRoute = "api" | TierId;

export type LeaderboardRow = {
  model: string;
  displayName: string;
  vendor: string;
  effort: string | null;
  accessRoute: AccessRoute;
  passAt1: number;
  effectiveCostUsd: number;
  costPerSolvedTaskUsd: number | null; // null when passAt1 is 0
  outputTokens: number;
  steps: number;
  throughputTokPerSec: number | null; // null when unmapped or absent from the snapshot
  averageTimeSeconds: number | null; // null when throughput is null
};
