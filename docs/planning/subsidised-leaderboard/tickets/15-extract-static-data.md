# 15: Extract static data to data/

Type: task
Status: ready-for-agent

## What to build

Move two hand-curated facts out of code and into `data/`, per the extraction criterion decided in the 2026-08-26 grilling: a value belongs in `data/` when it is a fact transcribed from an upstream source — something a human edits when the world changes, not when the code changes.

### Cost adjustment factors → `data/cost-adjustments.json`

Extract `costAdjustmentFactors` from `scripts/deepswe-snapshot.ts` into `data/cost-adjustments.json`, read only by the DeepSWE refresh script. Shape: `source` and `sourceUrl` provenance fields plus a `factors` object keyed by leaderboard model (currently `gpt-5-6-luna` 0.2, `gpt-5-6-terra` 0.8, `gemini-3-6-flash` 0.5). Not a field on `model-mapping.json`: the glossary defines model mapping as the link to OpenRouter id / family / multiplier, and repricing has a different lifecycle (edited on DeepSWE version bumps).

De-triplicate the tests: `scripts/deepswe-snapshot.test.ts` re-asserts all three pairs and `src/data/derive.test.ts` hardcodes `* 0.2`; after extraction the factor values should live in one place the tests read (or fixtures clearly marked as fixtures), not as re-transcribed literals.

This reverses ticket 10's "inline constant" decision, which predates the data-lives-in-data principle. When this ticket lands, append a note to ticket 10's decision log recording the reversal and pointing here.

### Provenance URLs → the data files they describe

Uniform `source` + `sourceUrl` fields on each data file, with the footer (`src/App.tsx`) reading them from the imported data instead of JSX literals:

- `tiers.json`: keep `source`, add `sourceUrl` (the SemiAnalysis tweet URL currently only in `App.tsx`)
- `openrouter-throughput.json`: refresh script writes both
- `deepswe-v1.1.json`: refresh script writes both

The DeepSWE origin URL used by the refresh script to fetch stays a script constant — it is config (where to fetch), not provenance (what was captured).

## Out of scope (decided, with rationale)

- `benchmarkVersion`'s seven copies — a coordination/refactoring problem, not upstream data
- `EFFORT_ORDER` — ranking semantics (the meaning of "best effort level"), not a transcribed fact; its silent-degradation issue is a validation fix, tracked separately if it bites
- `ACCESS_ROUTE_ORDER`, `TierId`/`SubscriptionFamily` — deliberate duplications with purity/type-safety rationale and a sync test
- Family labels, tag classes, column specs, theme storage key — presentation and config; the "adding a family touches four files" pain is a type-exhaustiveness problem, not extraction

## Acceptance criteria

- [ ] `data/cost-adjustments.json` exists with provenance fields; `scripts/deepswe-snapshot.ts` reads it; written snapshot output unchanged
- [ ] Factor values asserted in exactly one place across the test suite
- [ ] All three data files carry `source` + `sourceUrl`; the footer renders provenance from data imports, no citation URLs in JSX
- [ ] Ticket 10's decision log notes the reversal
- [ ] `vp run ready` passes
