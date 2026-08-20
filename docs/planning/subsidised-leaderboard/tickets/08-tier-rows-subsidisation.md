# 08: Tier rows and subsidisation

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

The table gains subscription-tier rows: every Claude/ChatGPT-family entry expands into its API row plus one row per tier of its family (191 rows total from the current data), each with an Access column ("API" or the tier label), effective cost, and its own cost per solved task.

Per the [spec](../spec.md) (Derivation rules, tiers data): subsidisation factor = tier price ÷ (equivalent API spend × usage multiplier); effective cost = average cost × factor on tier rows. The SemiAnalysis tier figures are checked in as data. Costs render as `$` + three significant figures. The page carries the disclaimer that subsidised costs are rough approximations based on SemiAnalysis estimates.

## Acceptance criteria

- [ ] Derive layer emits 191 rows: 62 API + 63 Claude-tier + 66 ChatGPT-tier
- [ ] Family "none" models never get tier rows
- [ ] Spot check: Claude Fable 5 claude-pro rows use factor 0.10 (usage multiplier 0.5), other Claude models 0.05
- [ ] Effective cost and cost per solved task render at three significant figures on tier rows
- [ ] Approximation disclaimer visible on the page
- [ ] Unit tests cover row expansion, subsidisation factor (incl. multiplier), and per-row cost per solved task
- [ ] `vp run ready` passes and the deployed site shows tier rows
