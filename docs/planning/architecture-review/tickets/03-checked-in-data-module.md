# 03: One checked-in data module validating all four snapshots

Type: grilling
Status: needs-triage

## Question

`src/data/sources.ts` is 22 lines with five exports and a load-bearing asymmetry no caller can see: the DeepSWE snapshot and model mapping are schema-parsed, `tiers.json` and `openrouter-throughput.json` are plain casts. `tiers.json` feeds the subsidisation divisor, so a zero or renamed field there yields Infinity effective costs with no error anywhere. The refresh scripts re-read the same files as casts. `types.ts` restates every shape that `schema.ts` also declares.

Recommendation strength at review: Worth exploring. Dependency category: in-process with a local-substitutable reader (bundled JSON imports in the app, filesystem in the scripts).

## ADR note

Touches [ADR 0004](../../../architecture/0004-load-time-invariants-replace-count-literals.md), which records that `tiers.json` and `openrouter-throughput.json` "stay plain casts". Worth reopening: throughput is now script-refreshed, and tiers feeds a divisor, so both fit the ADR's own rationale for load-time invariants. Reopen it explicitly in the grilling rather than silently.

## Shape to grill

- One module owning "the checked-in data": every file schema-parsed, types inferred from schemas, cross-file invariants (mapping and snapshot coverage, vendor and vendor-mapping coverage, tier price ordering per family, `TierId` enum, positive equivalent spend) checked in one place.
- Usable from both the browser tree and the scripts; ties into ticket 02's data store seam.
- The `LeaderboardSources` object from ticket 01 is the natural output shape.

## Open questions

- Does the tiers price-ordering invariant move from `leaderboard.test.ts` into the parse?
- Does `types.ts` disappear entirely, or keep the `Provenance` type the scripts share?
