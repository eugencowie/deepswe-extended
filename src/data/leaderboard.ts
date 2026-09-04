// The Leaderboard: every entry combined with every access route its family
// allows, plus the questions the toolbar and table ask of it. Built once from
// the four snapshots; tests build it from fixtures through the same interface.

import type {
  AccessRoute,
  DeepsweSnapshot,
  ModelMappingEntry,
  SubscriptionFamily,
  ThroughputSnapshot,
  Tier,
  TierId,
} from "./types.ts";

// The marker on a tier row naming its tier; API rows are untagged.
export type AccessTag = { label: string; family: Exclude<SubscriptionFamily, "none"> };

export type LeaderboardRow = {
  model: string;
  displayName: string;
  vendor: string;
  family: SubscriptionFamily;
  effort: string | null;
  accessRoute: AccessRoute;
  accessTag: AccessTag | null; // null on API rows
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

export type ModelOption = { model: string; displayName: string };

// A family model with a non-standard usage limit, badged per tier in the
// Subscriptions picker because its discount differs from the tier-wide one.
export type UsageLimitNote = { name: string; tierDiscount: number };

export type PickerTier = {
  id: TierId;
  shortLabel: string;
  // 1 − subsidisation factor at usage multiplier 1.0.
  tierDiscount: number;
  notes: UsageLimitNote[];
};

export type PickerFamily = {
  family: Exclude<SubscriptionFamily, "none">;
  tiers: PickerTier[];
};

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

export type Leaderboard = {
  rows: LeaderboardRow[];
  // One option per model, sorted by display name, for the Models picker.
  modelOptions: ModelOption[];
  // The Subscriptions picker's sections: Claude first, tiers in tiers.json
  // (ascending price) order.
  pickerFamilies: PickerFamily[];
  // Best view, API routes, every model selected.
  defaultFilters: () => LeaderboardFilters;
  visibleRows: (filters: LeaderboardFilters) => LeaderboardRow[];
  // Model-column order: display name, then effort (default first), then
  // access route (API first, then tiers in tiers.json order).
  compareModel: (a: LeaderboardRow, b: LeaderboardRow) => number;
};

const FAMILIES: PickerFamily["family"][] = ["claude", "chatgpt"];

export type LeaderboardSources = {
  snapshot: DeepsweSnapshot;
  mapping: ModelMappingEntry[];
  throughput: ThroughputSnapshot;
  tiers: Tier[];
};

export function createLeaderboard({
  snapshot,
  mapping,
  throughput,
  tiers,
}: LeaderboardSources): Leaderboard {
  const rows = deriveRows(snapshot, mapping, throughput, tiers);
  const modelOptions = [...new Map(rows.map((row) => [row.model, row.displayName]))]
    .map(([model, displayName]) => ({ model, displayName }))
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName, "en"));
  const routeOrder: AccessRoute[] = ["api", ...tiers.map((tier) => tier.id)];
  const pickerFamilies = FAMILIES.map((family) => ({
    family,
    tiers: tiers
      .filter((tier) => tier.family === family)
      .map((tier) => ({
        id: tier.id,
        shortLabel: tier.shortLabel,
        tierDiscount: tierDiscount(tier, 1),
        notes: mapping.flatMap((entry) =>
          entry.family !== family || entry.usageMultiplier === 1
            ? []
            : [
                {
                  name: entry.shortName ?? entry.displayName,
                  tierDiscount: tierDiscount(tier, entry.usageMultiplier),
                },
              ],
        ),
      })),
  }));
  return {
    rows,
    modelOptions,
    pickerFamilies,
    defaultFilters: () => ({
      effortView: "best",
      subscriptions: { claude: "api", chatgpt: "api" },
      models: new Set(modelOptions.map(({ model }) => model)),
    }),
    visibleRows: (filters) => filterRows(rows, filters),
    compareModel: (a, b) => {
      const byName = a.displayName.localeCompare(b.displayName, "en");
      if (byName !== 0) return byName;
      const byEffort = effortRank(a.effort) - effortRank(b.effort);
      if (byEffort !== 0) return byEffort;
      return routeOrder.indexOf(a.accessRoute) - routeOrder.indexOf(b.accessRoute);
    },
  };
}

function deriveRows(
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
        : (throughput.models[mapped.openrouterId]?.consumerP50 ?? null);
    const familyTiers = tiers.filter((tier) => tier.family === mapped.family);
    const row = (
      accessRoute: AccessRoute,
      accessTag: AccessTag | null,
      effectiveCostUsd: number,
    ): LeaderboardRow => ({
      model: entry.model,
      displayName: mapped.displayName,
      vendor: mapped.vendor,
      family: mapped.family,
      effort: entry.effort,
      accessRoute,
      accessTag,
      passAt1: entry.pass_at_1,
      effectiveCostUsd,
      costPerSolvedTaskUsd: costPerSolvedTask(effectiveCostUsd, entry.pass_at_1),
      apiCostUsd: entry.average_cost_usd,
      apiCostPerSolvedTaskUsd: costPerSolvedTask(entry.average_cost_usd, entry.pass_at_1),
      outputTokens: entry.output_tokens,
      steps: entry.steps,
      openrouterId: mapped.openrouterId,
      throughputTokPerSec,
      averageTimeSeconds:
        throughputTokPerSec === null ? null : entry.output_tokens / throughputTokPerSec,
    });
    return [
      row("api", null, entry.average_cost_usd),
      ...familyTiers.map((tier) =>
        row(
          tier.id,
          { label: tier.shortLabel, family: tier.family },
          entry.average_cost_usd * subsidisationFactor(tier, mapped.usageMultiplier),
        ),
      ),
    ];
  });
}

// Filter transitions: pure, returning a new filters value so React state
// (and any memo keyed on it) sees the change.
export function setEffortView(
  filters: LeaderboardFilters,
  effortView: LeaderboardFilters["effortView"],
): LeaderboardFilters {
  return { ...filters, effortView };
}

export function setRoute(
  filters: LeaderboardFilters,
  family: keyof SubscriptionSelection,
  route: AccessRoute,
): LeaderboardFilters {
  return { ...filters, subscriptions: { ...filters.subscriptions, [family]: route } };
}

export function setModels(
  filters: LeaderboardFilters,
  models: ReadonlySet<string>,
): LeaderboardFilters {
  return { ...filters, models };
}

export function toggleModel(filters: LeaderboardFilters, model: string): LeaderboardFilters {
  const models = new Set(filters.models);
  if (models.has(model)) {
    models.delete(model);
  } else {
    models.add(model);
  }
  return setModels(filters, models);
}

function filterRows(rows: LeaderboardRow[], filters: LeaderboardFilters): LeaderboardRow[] {
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

// Semantic effort order for the Model-sort tiebreak and the Best view; null
// (default effort) ranks lowest, unknown efforts highest.
const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"];

function effortRank(effort: string | null): number {
  if (effort === null) return -1;
  const rank = EFFORT_ORDER.indexOf(effort);
  return rank === -1 ? EFFORT_ORDER.length : rank;
}

// What a dollar of API cost becomes on a tier. The usage multiplier scales the
// equivalent API spend for models with non-standard usage limits.
function subsidisationFactor(tier: Tier, usageMultiplier: number): number {
  return tier.priceUsdPerMonth / (tier.equivalentApiSpendUsdPerMonth * usageMultiplier);
}

// A subsidisation factor as the discount it amounts to.
function tierDiscount(tier: Tier, usageMultiplier: number): number {
  return 1 - subsidisationFactor(tier, usageMultiplier);
}

function costPerSolvedTask(effectiveCostUsd: number, passAt1: number): number | null {
  if (passAt1 === 0) return null;
  return effectiveCostUsd / passAt1;
}
