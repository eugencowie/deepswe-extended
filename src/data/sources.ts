import rawSnapshot from "../../data/deepswe-v1.1.json";
import rawMapping from "../../data/model-mapping.json";
import rawThroughput from "../../data/openrouter-throughput.json";
import type { DeepsweSnapshot, ModelMappingEntry, ThroughputSnapshot } from "./types.ts";

export const deepsweSnapshot: DeepsweSnapshot = rawSnapshot as DeepsweSnapshot;
export const modelMapping: ModelMappingEntry[] = rawMapping as ModelMappingEntry[];
export const throughputSnapshot: ThroughputSnapshot = rawThroughput as ThroughputSnapshot;
