import type {
  AccessRoute,
  DeepsweSnapshot,
  LeaderboardRow,
  ModelMappingEntry,
  ThroughputSnapshot,
  Tier,
} from "./types.ts";

export function deriveRows(
  snapshot: DeepsweSnapshot,
  mapping: ModelMappingEntry[],
  throughput: ThroughputSnapshot,
  tiers: Tier[],
): LeaderboardRow[] {
  const byModel = new Map(mapping.map((entry) => [entry.leaderboardModel, entry]));
  return snapshot.entries.flatMap((entry) => {
    const mapped = byModel.get(entry.model);
    if (!mapped) {
      throw new Error(
        `Leaderboard model "${entry.model}" is missing from data/model-mapping.json; add a mapping entry for it.`,
      );
    }
    const throughputTokPerSec =
      mapped.openrouterId === null
        ? null
        : (throughput.models[mapped.openrouterId]?.medianP50 ?? null);
    const familyTiers = tiers.filter((tier) => tier.family === mapped.family);
    const row = (accessRoute: AccessRoute, effectiveCostUsd: number): LeaderboardRow => ({
      model: entry.model,
      displayName: mapped.displayName,
      vendor: mapped.vendor,
      effort: entry.effort,
      accessRoute,
      passAt1: entry.pass_at_1,
      effectiveCostUsd,
      costPerSolvedTaskUsd: costPerSolvedTask(effectiveCostUsd, entry.pass_at_1),
      outputTokens: entry.output_tokens,
      steps: entry.steps,
      throughputTokPerSec,
      averageTimeSeconds:
        throughputTokPerSec === null ? null : entry.output_tokens / throughputTokPerSec,
    });
    return [
      row("api", entry.average_cost_usd),
      ...familyTiers.map((tier) =>
        row(tier.id, entry.average_cost_usd * subsidisationFactor(tier, mapped.usageMultiplier)),
      ),
    ];
  });
}

// What a dollar of API cost becomes on a tier. The usage multiplier scales the
// equivalent API spend for models with non-standard usage limits.
export function subsidisationFactor(tier: Tier, usageMultiplier: number): number {
  return tier.priceUsdPerMonth / (tier.equivalentApiSpendUsdPerMonth * usageMultiplier);
}

export function costPerSolvedTask(effectiveCostUsd: number, passAt1: number): number | null {
  if (passAt1 === 0) return null;
  return effectiveCostUsd / passAt1;
}

export type SortDirection = "asc" | "desc";

// Blank cells sort last regardless of direction, so the direction is an input
// rather than applied by negating the result afterwards.
export function compareBlankLast(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}

// Semantic effort order for the Model-sort tiebreak; null (default effort)
// sorts first, unknown efforts last.
const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"];

function effortRank(effort: string | null): number {
  if (effort === null) return -1;
  const rank = EFFORT_ORDER.indexOf(effort);
  return rank === -1 ? EFFORT_ORDER.length : rank;
}

// API first, then tiers in ascending price order per family. Mirrors the
// tiers.json array order; a unit test keeps the two in sync so derive stays
// pure (no data import here).
export const ACCESS_ROUTE_ORDER: AccessRoute[] = [
  "api",
  "claude-pro",
  "claude-max-5x",
  "claude-max-20x",
  "chatgpt-plus",
  "chatgpt-pro-5x",
  "chatgpt-pro-20x",
];

export function compareModel(a: LeaderboardRow, b: LeaderboardRow): number {
  const byName = a.displayName.localeCompare(b.displayName, "en");
  if (byName !== 0) return byName;
  const byEffort = effortRank(a.effort) - effortRank(b.effort);
  if (byEffort !== 0) return byEffort;
  return ACCESS_ROUTE_ORDER.indexOf(a.accessRoute) - ACCESS_ROUTE_ORDER.indexOf(b.accessRoute);
}
