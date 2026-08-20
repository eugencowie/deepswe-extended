# Map: Subsidised leaderboard

Labels: wayfinder:map

## Destination

A spec at `docs/planning/subsidised-leaderboard/spec.md`, executable by a build session without further decisions, for a static web app that extends the DeepSWE v1.1 leaderboard with average time (via OpenRouter throughput), subscription-subsidised effective costs (via SemiAnalysis tier figures), and cost per solved task — as separate sortable/filterable rows per access route.

## Notes

- Vocabulary lives in [docs/context.md](../../context.md); use its terms (effective cost, access route, usage multiplier, …).
- This is deliberately a **rough approximation** tool: consistent roughness beats false precision. Don't gold-plate the maths.
- User preferences: Vite/React/TypeScript ecosystem; GitHub Pages hosting; user can transcribe source data by hand if no machine-readable source exists.
- Research tickets are **not** auto-run (see `docs/agents/issue-tracker.md`): leave them unclaimed for the user to launch.

## Decisions so far

- [Charting grilling: destination and core decisions](tickets/01-charting-grilling.md): destination (spec), row model (API row + six tier rows), all maths (subsidisation factor with usage multiplier, Fable 5 = 0.5; average time; cost per solved task), SemiAnalysis tier figures captured verbatim, hand-curated model mapping, table UX (columns, filters, per-model include/exclude, default sort Pass@1 desc), stack (Vite + React + TS + TanStack Table, build-time data import, TS refresh scripts), hosting (GitHub Pages, public repo).
- [DeepSWE v1.1 source and metric semantics](tickets/02-research-deepswe-leaderboard-data.md): use the public versioned leaderboard JSON and versions manifest; keep all 62 configurations; apply the site's three v1.1 display-cost factors; treat Pass@1 as scored-attempt pass rate and cost, output tokens, and steps as per-attempt means; pin v1.1 while monitoring both the manifest and live artifact timestamp.

## Not yet specified

- **Throughput fallback**: if ticket 03 finds no usable API, decide between scraping the frontend and hand-maintained throughput values.
- **Token-semantics reconciliation**: DeepSWE output tokens include provider-reported reasoning tokens; once ticket 03 establishes OpenRouter's throughput semantics, pick a convention in the spec.
- **Version-bump workflow**: the site exposes a versions manifest and keeps v1.1 live; specify the review step for a new manifest `latest` value and for display-cost-factor changes.

## Out of scope

- **Cloudflare Workers hosting** — user ruled it unnecessary; GitHub Pages chosen.
- **Accuracy modelling beyond the approximation** — latency, per-step overhead, cache-pricing effects; the tool's point is rough comparability.
- **Building the app** — the destination is the spec; the build is a follow-on effort once ticket 04 closes.
