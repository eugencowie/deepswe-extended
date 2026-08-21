# 06: Base leaderboard table of API rows

Type: task
Status: ready-for-agent
Blocked by: 05

## What to build

Visiting the site shows the DeepSWE v1.1 leaderboard as a sortable table of the 62 API rows: model display name, effort ("default" when the source has none), Pass@1, average cost, cost per solved task, output tokens, and steps, sorted by Pass@1 descending by default.

Foundations this slice establishes, per the [spec](../spec.md) (Data files, Derivation rules):

- The DeepSWE snapshot (seeded from the research capture) and the full 25-entry model mapping (display name, vendor, OpenRouter id, family, usage multiplier) checked in as data files, imported at build time through shared TypeScript types.
- A pure derive layer producing rows from snapshot + mapping; a leaderboard model missing from the mapping fails the build loudly.
- Cost per solved task = cost ÷ Pass@1, formatted as `$` + three significant figures.
- The UI stack replaces the template scaffold: React + TanStack Table + shadcn/ui (Base UI primitives) + Tailwind, per [ADR 0001](../../../architecture/0001-toolchain-conventions.md). Use shadcn's table markup with your own TanStack wiring; don't stack two table abstractions.
- A minimal Playwright smoke: build at a sentinel base, serve with `vp preview`, assert the table renders with no failed requests. This is the gate for the root-absolute-URL bug class the base-at-deploy-time convention leaves open.

## Acceptance criteria

- [ ] Page renders exactly 62 rows from the seed snapshot with mapping display names
- [ ] Default sort is Pass@1 descending; every column sorts both ways
- [ ] Spot check: Luna rows show display-adjusted costs, not raw source values
- [ ] Removing a model from the mapping makes the build fail with a clear error
- [ ] Derive layer has unit tests (row derivation, cost per solved task, missing-mapping failure)
- [ ] Playwright smoke passes: sentinel-base build renders the table with no failed requests
- [ ] `vp run ready` passes and the deployed site shows the table
