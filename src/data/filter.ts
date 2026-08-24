import { effortRank } from "./derive.ts";
import type { AccessRoute, LeaderboardRow } from "./types.ts";

// The Subscriptions picker: exactly one access route per family, so every
// entry appears on exactly one row and the picker changes pricing, never row
// count. Rows whose family is "none" ignore the picker entirely.
export type SubscriptionSelection = {
  claude: AccessRoute;
  chatgpt: AccessRoute;
};

export type LeaderboardFilters = {
  effortView: "best" | "all";
  subscriptions: SubscriptionSelection;
  models: ReadonlySet<string>;
};

export function defaultFilters(models: Iterable<string>): LeaderboardFilters {
  return {
    effortView: "best",
    subscriptions: { claude: "api", chatgpt: "api" },
    models: new Set(models),
  };
}

export function filterRows(rows: LeaderboardRow[], filters: LeaderboardFilters): LeaderboardRow[] {
  // Best keeps each model's highest-effort entry, not its best Pass@1 — for
  // claude-fable-5 a lower effort scores higher and the DeepSWE site's Best
  // view still shows the highest effort. A single-entry model keeps its entry.
  const bestRank = new Map<string, number>();
  if (filters.effortView === "best") {
    for (const row of rows) {
      const rank = effortRank(row.effort);
      if (rank > (bestRank.get(row.model) ?? -Infinity)) bestRank.set(row.model, rank);
    }
  }
  return rows.filter(
    (row) =>
      filters.models.has(row.model) &&
      (row.family === "none" || filters.subscriptions[row.family] === row.accessRoute) &&
      (filters.effortView === "all" || effortRank(row.effort) === bestRank.get(row.model)),
  );
}
