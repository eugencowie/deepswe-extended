# DeepSWE Analysis

Combines the DeepSWE leaderboard with OpenRouter throughput data and SemiAnalysis subscription research to compare models by effective cost, speed, and bang for buck — including what a task "really" costs on a subscription.

## Language

**Leaderboard entry**:
One (model, effort level) result from the DeepSWE leaderboard: Pass@1, average cost, output tokens, steps.
_Avoid_: model row, result

**Effort level**:
The reasoning-effort setting a model was benchmarked at. Part of an entry's identity: the same model at two effort levels is two entries.

**Access route**:
How you would pay to run a model: direct API, or a specific subscription tier. Every table row is an entry combined with one access route.
_Avoid_: pricing mode, plan type

**Tier**:
A paid ChatGPT or Claude subscription plan (e.g. claude-max-5x, chatgpt-plus).
_Avoid_: subscription level, plan

**Subscription family**:
Which vendor's tiers can run a model: ChatGPT, Claude, or none.

**Equivalent API spend**:
SemiAnalysis's approximation of the monthly API-priced usage a tier allows.
_Avoid_: max possible spend, usage allowance

**Usage multiplier**:
A per-model factor scaling equivalent API spend, capturing models with non-standard usage limits. Default 1.0; Fable 5 is 0.5 because its subscription limits are halved.

**Subsidisation factor**:
Tier price ÷ (equivalent API spend × usage multiplier). What a dollar of API cost becomes on that tier.

**Effective cost**:
The cost shown on a row: the entry's average cost as-is on API rows, multiplied by the subsidisation factor on tier rows.
_Avoid_: subsidised cost, adjusted cost

**Cost per solved task**:
Effective cost ÷ Pass@1. The bang-for-buck number; lower is better.
_Avoid_: bang for buck, value score

**Throughput**:
A model's tokens-per-second figure, sourced from OpenRouter. One number per model, shared across effort levels.
_Avoid_: speed, generation rate

**Average time**:
Output tokens ÷ throughput. Deliberately ignores latency, prompt processing, and tool-execution time.

**Model mapping**:
The hand-curated link from a leaderboard model to its OpenRouter id, subscription family, and usage multiplier.

**Snapshot**:
A checked-in, point-in-time capture of a source, refreshed manually.
_Avoid_: live data, cache
