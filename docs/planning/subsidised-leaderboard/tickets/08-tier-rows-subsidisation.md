# 08: Tier rows and subsidisation

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

The table gains subscription-tier rows: every Claude/ChatGPT-family entry expands into its API row plus one row per tier of its family (185 rows total from the current data). Access route is not a column — tier rows render an access tag inside the Model cell (this ticket decides the exact styling; API rows stay untagged). Tier-row Avg cost cells show the effective cost annotated with "(e)" and a tooltip ("effective cost: average cost × subsidisation factor"); Cost/perf recomputes per row from the effective cost.

Per the [spec](../spec.md) (Derivation rules, tiers data): subsidisation factor = tier price ÷ (equivalent API spend × usage multiplier); effective cost = average cost × factor on tier rows. The SemiAnalysis tier figures are checked in as data. Costs render as standard two-decimal currency; sub-cent tier costs collapse to $0.01 or $0.00 on purpose (they should read as "effectively free"). The footer gains its third line: the disclaimer that subsidised costs are rough approximations based on SemiAnalysis estimates.

## Acceptance criteria

- [ ] Derive layer emits 185 rows: 62 API + 63 Claude-tier + 60 ChatGPT-tier
- [ ] Family "none" models never get tier rows
- [ ] Spot check: Claude Fable 5 claude-pro rows use factor 0.10 (usage multiplier 0.5), other Claude models 0.05
- [ ] Tier rows show an access tag in the Model cell; API rows show none
- [ ] Tier-row Avg cost cells carry the "(e)" annotation with its tooltip; Avg cost and Cost/perf render as two-decimal currency on tier rows (sub-cent values as $0.01/$0.00)
- [ ] Approximation disclaimer visible in the footer
- [ ] Unit tests cover row expansion, subsidisation factor (incl. multiplier), and per-row cost per solved task
- [ ] `vp run ready` passes and the deployed site shows tier rows

## Comments

**From the ticket 06 grilling (2026-08-23):** the Model-sort tiebreak extends to access routes: display name, then effort (default first, then low, medium, high, xhigh, max), then access route with API first and tiers in ascending price order (their order in `tiers.json`). Also, widen ticket 06's `accessRoute: "api"` union with tier ids here rather than reshaping the row type.

**From the ticket 06 review grilling (2026-08-23):** Model-sort descending is the exact inverse of ascending, tiebreaks included — the effort order above (and the access-route order once this ticket adds it) mirrors too. Separately: the e2e smoke asserts the tbody row count against the snapshot entry count; when this ticket expands the table, update that expectation to the derived row count.

**From the ticket 08 grilling (2026-08-24):**

- **Row count corrected to 185.** The spec's 191 was an arithmetic error: the checked-in data has 20 ChatGPT-family entries, not 22 (gpt-5-5 ×4, gpt-5-4 ×1). 62 API + 63 Claude-tier + 60 ChatGPT-tier. Spec and this ticket updated. Unit tests derive expected per-family counts from the mapping + snapshot, plus one literal 185 spot-check so the derivation isn't self-confirming.
- **Access tag:** shortened tier label ("Pro", "Max 5x", "Max 20x", "Plus", "Pro 5x", "Pro 20x") stored as a new `shortLabel` field in `tiers.json` (explicit data, per the displayName convention — never derived by string-stripping). Rendered as a shadcn outline Badge after the effort bracket in the Model cell, colour-coded by family: amber for Claude (`amber-600`, dark `amber-400`), teal for ChatGPT (`teal-600`, dark `teal-400`). Adding the badge component means updating `src/components/ui/README.md`'s regeneration list.
- **"(e)" annotation:** cell renders as "$0.22 (e)" with the tooltip on the "(e)" marker, reusing the existing dotted-underline Tooltip pattern (note: column `tooltip` currently feeds headers only; the cell renderer uses the Tooltip component directly). Cost/perf cells stay unannotated — the adjacent "(e)" and the header tooltip cover it.
- **Footer third line:** "Subsidised costs are rough approximations based on SemiAnalysis estimates." — the whole line is a dotted-underline link (matching the existing two) to <https://x.com/SemiAnalysis_/status/2064815044085318040>.
- **e2e:** the smoke's row-count assertion stays data-derived and becomes the full derived count (185) in this ticket; ticket 09's API-only default filter later drops the visible set to 62.
