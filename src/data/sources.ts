import rawSnapshot from "../../data/deepswe-v1.1.json" with { type: "json" };
import rawMapping from "../../data/model-mapping.json" with { type: "json" };
import rawThroughput from "../../data/openrouter-throughput.json" with { type: "json" };
import rawTiers from "../../data/tiers.json" with { type: "json" };
import { assertMappingCoverage, deepsweSnapshotSchema, modelMappingSchema } from "./schema.ts";
import type {
  DeepsweSnapshot,
  ModelMappingEntry,
  ThroughputSnapshot,
  Tier,
  TiersSnapshot,
} from "./types.ts";

// The refresh-written files are schema-parsed at load (ADR 0004); the
// hand-maintained ones stay plain casts.
export const deepsweSnapshot: DeepsweSnapshot = deepsweSnapshotSchema.parse(rawSnapshot);
export const modelMapping: ModelMappingEntry[] = modelMappingSchema.parse(rawMapping);
assertMappingCoverage(deepsweSnapshot, modelMapping);

export const throughputSnapshot: ThroughputSnapshot = rawThroughput as ThroughputSnapshot;
export const tiersSnapshot: TiersSnapshot = rawTiers as TiersSnapshot;
export const tiers: Tier[] = tiersSnapshot.tiers;
