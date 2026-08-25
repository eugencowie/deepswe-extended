# Write the spec

Type: task
Status: resolved
Blocked by: 02, 03

## Question

Assemble everything decided and discovered into `docs/planning/subsidised-leaderboard/spec.md` — the destination of this map: a spec a build session can execute without further decisions.

The spec must cover:

- **Data files and schemas**: the checked-in snapshot JSON for leaderboard entries, throughput, tier figures, and the model mapping (leaderboard model → OpenRouter id, subscription family, usage multiplier) — shapes shared as TypeScript types between refresh scripts and app.
- **The model mapping content itself**, drafted from tickets 02 and 03's captured data, including which models have no OpenRouter listing (blank average time) and each model's usage multiplier (Fable 5 = 0.5, all else 1.0).
- **Derivation rules**: row expansion (API row + tier rows per subscription family), subsidisation factor, effective cost, average time, cost per solved task, blank-sorts-last handling — as decided in [01-charting-grilling.md](01-charting-grilling.md).
- **Refresh scripts**: TypeScript (`tsx`) fetchers for the leaderboard and OpenRouter per tickets 02/03's findings, or the manual-refresh procedure where no machine-readable source exists.
- **App**: Vite + React + TS + TanStack Table; columns, filters, per-model include/exclude, default sort Pass@1 descending; data imported at build time.
- **Repo and deploy**: creating the public `deepswe-extended` GitHub repo (no remote exists yet) and the Actions workflow deploying to GitHub Pages.

Resolve any token-semantics mismatch surfaced by 02/03 (e.g. reasoning tokens counted in output tokens but not in throughput) by picking the least-wrong convention and stating it in the spec — the tool is explicitly a rough approximation.

Review the draft spec with the user before closing (HITL).

## Answer

Resolved 2026-08-20. The spec is at [spec.md](../spec.md), approved by the user after a grilling review.

The draft assembled all prior decisions plus the research facts (versioned JSON artifact with display-cost factors; OpenRouter model-endpoints API with median-of-p50s aggregation; full 25-model mapping — every model has an OpenRouter listing). It settled the two fog items: token semantics (treat both DeepSWE output tokens and OpenRouter throughput as reasoning-inclusive and divide directly; label Avg time an estimate) and the version-bump workflow (script warns on a new manifest `latest`; human reviews changelog and bundle cost factors before moving the pin).

The grilling review added: explicit `displayName`/`vendor` fields in the mapping (no derivation from OpenRouter author strings); API-only default view with tiers opt-in; short tier labels; 3-significant-figure cost formatting; no attempt-count display; local-only `OPENROUTER_API_KEY` (never in CI); and the toolchain — Vite+ template scaffolded by the user, pnpm, mise with the vite-plus plugin, `vp run ready` as the CI gate.
