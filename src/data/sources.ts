import rawSnapshot from "../../data/deepswe-v1.1.json";
import rawMapping from "../../data/model-mapping.json";
import type { DeepsweSnapshot, ModelMappingEntry } from "./types.ts";

export const deepsweSnapshot: DeepsweSnapshot = rawSnapshot as DeepsweSnapshot;
export const modelMapping: ModelMappingEntry[] = rawMapping as ModelMappingEntry[];
