import rawSnapshot from "../../data/deepswe-v1.1.json" with { type: "json" };
import rawMapping from "../../data/model-mapping.json" with { type: "json" };
import rawThroughput from "../../data/openrouter-throughput.json" with { type: "json" };
import rawTiers from "../../data/tiers.json" with { type: "json" };
import type {
  DeepsweSnapshot,
  ModelMappingEntry,
  ThroughputSnapshot,
  Tier,
  TiersSnapshot,
} from "./types.ts";

export const deepsweSnapshot: DeepsweSnapshot = rawSnapshot as DeepsweSnapshot;
export const modelMapping: ModelMappingEntry[] = rawMapping as ModelMappingEntry[];
export const throughputSnapshot: ThroughputSnapshot = rawThroughput as ThroughputSnapshot;
export const tiersSnapshot: TiersSnapshot = rawTiers as TiersSnapshot;
export const tiers: Tier[] = tiersSnapshot.tiers;
