# 01: Deepen the leaderboard module

Type: task
Status: resolved

## What to build

One module, `src/data/leaderboard.ts`, built once from the four snapshots, that answers every question the render modules used to work out for themselves: rows with their access tag, the Subscriptions picker's tier discounts and usage-limit notes, the model options, filtering with the best-effort view, and the Model-column sort. `derive.ts` and `filter.ts` are absorbed; the table and toolbar stop importing data files.

Recommendation strength at review: Strong. Dependency category: in-process.

## Decisions (grilled 2026-09-03)

- Scope: rows, tier join, discounts, filtering, picker options. Footer provenance and the UTC-date helper stay in App.
- Construction: `createLeaderboard(sources)` with a single options object; App calls it once at top level. No singleton importing `sources.ts`. The unmapped-model throw stays.
- Interface: `rows`, `modelOptions`, `pickerFamilies` (tier discount as a number, notes with their own discount), `defaultFilters()`, `visibleRows(filters)`, `compareModel(a, b)` bound to the instance because route order comes from the tiers passed in. Filter transitions are pure module-level exports.
- Rows carry `accessTag: { label, family } | null`; the table keeps only its family-to-colour map.
- Percent formatting stays in the toolbar; `formatTierDiscount` takes the discount, not the factor.
- `compareBlankLast` and `SortDirection` move beside the table in `leaderboard-sort.ts`, pending ticket 04.
- Tests replace, not layer: `derive.test.ts` and `filter.test.ts` merged into `leaderboard.test.ts`; the `ACCESS_ROUTE_ORDER` sync test deleted; value tests use fixtures, live-data tests assert structure only (ADR 0004).
- Recorded as [ADR 0005](../../../architecture/0005-leaderboard-module-owns-tier-join.md); "Leaderboard" added to the glossary.

## Answer

Built in commit `42409e5` and the review follow-up on this branch. Review findings deferred to ticket 04: the fourth `compareModel` argument threaded through every `ColumnSpec.compare`.
