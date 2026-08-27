import { describe, expect, test } from "vite-plus/test";

import { assertMappingCoverage, deepsweSnapshotSchema, modelMappingSchema } from "./schema.ts";
import { deepsweSnapshot, modelMapping } from "./sources.ts";

// Importing sources.ts already parses the committed files, so the accepting
// path is exercised by every test run; these pin the rejections (ADR 0004).

describe("deepsweSnapshotSchema", () => {
  test("rejects a duplicate (model, effort) identity", () => {
    const tampered = {
      ...deepsweSnapshot,
      entries: [...deepsweSnapshot.entries, deepsweSnapshot.entries[0]],
    };
    expect(() => deepsweSnapshotSchema.parse(tampered)).toThrowError(/duplicate leaderboard entry/);
  });

  test("accepts the same model at a new effort", () => {
    const entry = { ...deepsweSnapshot.entries[0], effort: "brand-new-effort" };
    const grown = { ...deepsweSnapshot, entries: [...deepsweSnapshot.entries, entry] };
    expect(() => deepsweSnapshotSchema.parse(grown)).not.toThrow();
  });
});

describe("modelMappingSchema", () => {
  test("rejects a duplicate mapping key", () => {
    const tampered = [...modelMapping, { ...modelMapping[0] }];
    expect(() => modelMappingSchema.parse(tampered)).toThrowError(/duplicate mapping key/);
  });
});

describe("assertMappingCoverage", () => {
  test("rejects a snapshot model missing from the mapping", () => {
    const [dropped, ...rest] = modelMapping;
    expect(() => assertMappingCoverage(deepsweSnapshot, rest)).toThrowError(
      dropped.leaderboardModel,
    );
  });

  test("rejects a mapping entry matching no snapshot model", () => {
    const orphaned = [...modelMapping, { ...modelMapping[0], leaderboardModel: "ghost-model" }];
    expect(() => assertMappingCoverage(deepsweSnapshot, orphaned)).toThrowError(/ghost-model/);
  });
});
