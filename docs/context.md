# DeepSWE Leaderboard, Extended

Combines the DeepSWE leaderboard with OpenRouter throughput data and SemiAnalysis subscription research to compare models by effective cost, speed, and bang for buck — including what a task "really" costs on a subscription.

## Language

**Leaderboard entry**:
One (model, effort level) result from the DeepSWE leaderboard: Pass@1, average cost, output tokens, steps.
_Avoid_: model row, result

**Effort level**:
The reasoning-effort setting a model was benchmarked at. Part of an entry's identity: the same model at two effort levels is two entries.

**Best effort level**:
The highest effort level a model was benchmarked at, with default effort ranking lowest. The Best view keeps only each model's best-effort entry — not necessarily its best Pass@1.

**Access route**:
How you would pay to run a model: direct API, or a specific subscription tier. Every table row is an entry combined with one access route.
_Avoid_: pricing mode, plan type

**Access tag**:
The marker on a tier row naming its tier; API rows are untagged.
_Avoid_: tier badge, plan label

**Tier**:
A paid ChatGPT or Claude subscription plan (e.g. claude-max-5x, chatgpt-plus).
_Avoid_: subscription level, plan

**Subscriptions picker**:
The user-facing name of the access-route selector. Exactly one access route is selected per subscription family. "API" appears inside it even though API access is not a subscription; internal vocabulary stays "access route".

**Subscription family**:
Which vendor's tiers can run a model: ChatGPT, Claude, or none.

**Equivalent API spend**:
SemiAnalysis's approximation of the monthly API-priced usage a tier allows.
_Avoid_: max possible spend, usage allowance

**Usage multiplier**:
A per-model factor scaling equivalent API spend, capturing models with non-standard usage limits. Default 1.0; Fable 5 is 0.5 because its subscription limits are halved.

**Subsidisation factor**:
Tier price ÷ (equivalent API spend × usage multiplier). What a dollar of API cost becomes on that tier.

**Tier discount**:
A subsidisation factor expressed as a percentage discount: 1 − factor. Shown in the Subscriptions picker per tier, at usage multiplier 1.0 unless labelled with a specific model.
_Avoid_: discount multiplier

**API cost**:
The entry's average cost at direct API pricing. On tier rows it appears struck out beside the effective cost.
_Avoid_: API price, list price

**Effective cost**:
The cost a row is ranked by: the API cost as-is on API rows, multiplied by the subsidisation factor on tier rows.
_Avoid_: subsidised cost, adjusted cost

**Cost per solved task**:
Effective cost ÷ Pass@1. The bang-for-buck number; lower is better.
_Avoid_: bang for buck, value score

**Throughput**:
The p50 tokens-per-second of a model's consumer endpoint, as measured by OpenRouter. One number per model, shared across effort levels; blank when the model has no consumer endpoint.
_Avoid_: speed, generation rate

**Consumer endpoint**:
The vendor-run API endpoint a typical non-enterprise user would hit (e.g. Anthropic direct rather than Claude on AWS, Google AI Studio rather than Vertex), selected by a per-vendor rule. Enterprise platforms, premium-speed products, and resellers are not consumer endpoints.
_Avoid_: official endpoint, default provider

**Average time**:
Output tokens ÷ throughput. Deliberately ignores latency, prompt processing, and tool-execution time.

**Source column**:
A leaderboard column reported verbatim by the DeepSWE leaderboard (Pass@1, average cost, output tokens, steps).

**Derived column**:
A leaderboard column this project computes rather than takes from the DeepSWE leaderboard (cost per solved task, average time, throughput). The distinction is per-column, not per-cell: effective cost on tier rows is computed, but "Avg cost" is still a source column.

**Model mapping**:
The hand-curated link from a leaderboard model to its OpenRouter id, subscription family, usage multiplier, and optional short name (falling back to the display name).

**Snapshot**:
A checked-in, point-in-time capture of a source, refreshed only through human-reviewed commits, never at build or run time.
_Avoid_: live data, cache

**Cost adjustment factor**:
The DeepSWE site's retroactive repricing multiplier for a model's costs. The snapshot keeps raw values beside adjusted ones.
_Avoid_: display factor, repricing factor, display-cost factor
