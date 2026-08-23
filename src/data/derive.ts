import type { DeepsweSnapshot, LeaderboardRow, ModelMappingEntry } from "./types.ts";

export function deriveRows(
  snapshot: DeepsweSnapshot,
  mapping: ModelMappingEntry[],
): LeaderboardRow[] {
  const byModel = new Map(mapping.map((entry) => [entry.leaderboardModel, entry]));
  return snapshot.entries.map((entry) => {
    const mapped = byModel.get(entry.model);
    if (!mapped) {
      throw new Error(
        `Leaderboard model "${entry.model}" is missing from data/model-mapping.json; add a mapping entry for it.`,
      );
    }
    return {
      model: entry.model,
      displayName: mapped.displayName,
      vendor: mapped.vendor,
      effort: entry.effort,
      accessRoute: "api",
      passAt1: entry.pass_at_1,
      effectiveCostUsd: entry.average_cost_usd,
      costPerSolvedTaskUsd: costPerSolvedTask(entry.average_cost_usd, entry.pass_at_1),
      outputTokens: entry.output_tokens,
      steps: entry.steps,
    };
  });
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

export function compareModel(a: LeaderboardRow, b: LeaderboardRow): number {
  const byName = a.displayName.localeCompare(b.displayName, "en");
  if (byName !== 0) return byName;
  return effortRank(a.effort) - effortRank(b.effort);
}
