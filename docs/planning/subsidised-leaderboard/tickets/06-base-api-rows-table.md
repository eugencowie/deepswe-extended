# 06: Base leaderboard table of API rows

Type: task
Status: claimed
Blocked by: 05

## What to build

Visiting the site shows the DeepSWE v1.1 leaderboard as a sortable table of the 62 API rows, six columns: Model, Pass@1, Avg cost, Cost/perf, Out tok, Steps. Default sort is Pass@1 descending. Effort is not a column: it collapses into the Model cell DeepSWE-style ("Claude Opus 5 [max]"), and default-effort rows show no bracket. Cost/perf is the cost per solved task (avg cost ÷ Pass@1), with a header tooltip explaining the calculation ("Avg cost ÷ Pass@1: what you pay per task actually solved").

Foundations this slice establishes, per the [spec](../spec.md) (Data files, Derivation rules):

- The DeepSWE snapshot copied **verbatim** from the research capture (keeping `raw_sha256`; the type gains the field) and the full 25-entry model mapping (display name, vendor, OpenRouter id, family, usage multiplier) checked in as data files, imported at build time through shared TypeScript types.
- A pure derive layer producing API rows from snapshot + mapping. Each row carries an access-route field, fixed to "API" in this slice, so ticket 08 adds rows instead of reshaping the type. A leaderboard model missing from the mapping makes derive throw, and a unit test enforces full coverage — the failure surfaces through `vp run ready` and CI, with no separate build-step check.
- Cost per solved task = cost ÷ Pass@1, formatted as `$` + three significant figures, displayed under the "Cost/perf" header.
- Sorting is a two-state toggle (ascending ↔ descending, no unsorted state). The blank-last comparator ("–" cells sort last in both directions) is built and unit-tested now, even though the seed data may never blank a cell.
- A footer line shows the snapshot provenance — "DeepSWE v1.1 snapshot, 2026-08-20" — read from the data file's `source_generated_at`, not hardcoded. Tickets 07 and 08 add their own footer lines.
- The UI stack replaces the template scaffold: React + TanStack Table + shadcn/ui (Base UI primitives) + Tailwind, per [ADR 0001](../../../architecture/0001-toolchain-conventions.md). Use shadcn's table markup with your own TanStack wiring; don't stack two table abstractions. shadcn footprint is minimal: init plus Table, Tooltip, and Button — later tickets `shadcn add` their own.
- A minimal Playwright smoke: standalone `@playwright/test`, Chromium only, living in `e2e/` (excluded from Vitest's glob) — build at `/sentinel-base/`, serve with `vp preview`, assert the table renders with no failed requests. Appended to the `ready` script so CI and deploy gate on it. This is the gate for the root-absolute-URL bug class the base-at-deploy-time convention leaves open.

## Acceptance criteria

- [ ] Page renders exactly 62 rows from the seed snapshot with mapping display names; effort renders as a Model-cell bracket, absent on default-effort rows
- [ ] Default sort is Pass@1 descending; every column sorts both ways via a two-state toggle
- [ ] Spot check: Luna rows show display-adjusted costs, not raw source values
- [ ] Removing a model from the mapping makes `vp run ready` fail with a clear error
- [ ] Derive layer has unit tests (row derivation, cost per solved task, missing-mapping failure, blank-last comparator)
- [ ] Footer shows the DeepSWE snapshot date sourced from the data file
- [ ] Playwright smoke passes: sentinel-base build renders the table with no failed requests
- [ ] `vp run ready` passes and the deployed site shows the table

## Comments

**2026-08-23** — Scope addition during foundation work: a theme system (`theme-provider.tsx`, `mode-toggle.tsx`, dark-mode CSS variant) landed alongside the shadcn init. No spec or ticket asked for dark mode; both files are copied from the shadcn docs and treated as vendored, like the rest of `src/components/ui/`. The dropdown-menu component (also shadcn-vendored) currently exists only to serve the mode toggle; ticket 09 will reuse it for the filter dropdown. The Inter font came in as part of the shadcn setup.
