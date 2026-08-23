# 08: Tier rows and subsidisation

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

The table gains subscription-tier rows: every Claude/ChatGPT-family entry expands into its API row plus one row per tier of its family (191 rows total from the current data). Access route is not a column — tier rows render an access tag inside the Model cell (this ticket decides the exact styling; API rows stay untagged). Tier-row Avg cost cells show the effective cost annotated with "(e)" and a tooltip ("effective cost: average cost × subsidisation factor"); Cost/perf recomputes per row from the effective cost.

Per the [spec](../spec.md) (Derivation rules, tiers data): subsidisation factor = tier price ÷ (equivalent API spend × usage multiplier); effective cost = average cost × factor on tier rows. The SemiAnalysis tier figures are checked in as data. Costs render as standard two-decimal currency; sub-cent tier costs collapse to $0.01 or $0.00 on purpose (they should read as "effectively free"). The footer gains its third line: the disclaimer that subsidised costs are rough approximations based on SemiAnalysis estimates.

## Acceptance criteria

- [ ] Derive layer emits 191 rows: 62 API + 63 Claude-tier + 66 ChatGPT-tier
- [ ] Family "none" models never get tier rows
- [ ] Spot check: Claude Fable 5 claude-pro rows use factor 0.10 (usage multiplier 0.5), other Claude models 0.05
- [ ] Tier rows show an access tag in the Model cell; API rows show none
- [ ] Tier-row Avg cost cells carry the "(e)" annotation with its tooltip; Avg cost and Cost/perf render as two-decimal currency on tier rows (sub-cent values as $0.01/$0.00)
- [ ] Approximation disclaimer visible in the footer
- [ ] Unit tests cover row expansion, subsidisation factor (incl. multiplier), and per-row cost per solved task
- [ ] `vp run ready` passes and the deployed site shows tier rows

## Comments

**From the ticket 06 grilling (2026-08-23):** the Model-sort tiebreak extends to access routes: display name, then effort (default first, then low, medium, high, xhigh, max), then access route with API first and tiers in ascending price order (their order in `tiers.json`). Also, widen ticket 06's `accessRoute: "api"` union with tier ids here rather than reshaping the row type.
