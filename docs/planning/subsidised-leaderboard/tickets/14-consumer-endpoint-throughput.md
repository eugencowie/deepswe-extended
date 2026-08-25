# 14: Consumer-endpoint throughput and pinned DeepSeek revisions

Type: task
Status: resolved

## What to build

Throughput switches from the all-provider OpenRouter median to the vendor's consumer-endpoint p50, per [ADR 0002](../../../architecture/0002-throughput-consumer-endpoint.md): both DeepSeek mappings pin to their benchmarked revisions (`deepseek/deepseek-v4-flash-0731`, `deepseek/deepseek-v4-pro-0813`), the snapshot field renames `medianP50` → `consumerP50`, the Tok/s and Avg time tooltips name the new source, and the Model cell gains a tooltip showing the mapped OpenRouter id.

Diagnosis that led here: the site showed DeepSeek V4 Flash at 38 tok/s while DeepSeek's own endpoint served ~80. Two independent causes — the unversioned alias pointed at the April preview rather than the benchmarked 0731 GA (the V4 Pro entry had the same bug against 0813, confirmed by DeepSWE-score match with the official model cards), and the median-across-providers statistic answered a different question than the API row's costs imply.

## Acceptance criteria

- [x] Both DeepSeek mappings revision-pinned; display names unchanged (revision lives in the Model-cell tooltip)
- [x] Snapshot regenerated with `consumerP50` values from the 2026-08-25 frontend-feed capture; footer date follows
- [x] Tooltips: Tok/s "p50 throughput of the vendor's own consumer API (via OpenRouter stats). Not the speed measured in the benchmark run"; Avg time "Output tokens ÷ vendor API throughput; excludes tool execution and gaps between the agent's calls"
- [x] A model absent from the snapshot renders blank and sorts last (existing ticket 07 semantics)
- [x] Ticket 11 updated: consumer-endpoint selection rule plus missing-id/missing-endpoint guards
- [x] `vp check` and `vp test` pass

## Comments

**Grilling decisions (2026-08-25):**

- Tok/s answers "how fast is the model on the vendor's consumer endpoint": V4 Flash shows ~80, not the 51 median or OpenRouter's 128 fastest-provider headline. ("Consumer API" is the user-facing phrasing; the glossary term stays "consumer endpoint".)
- Consumer endpoint per vendor: Anthropic direct (not Claude-on-AWS), Google AI Studio (not Vertex), Moonshot standard (not Highspeed, 2× price), xAI standard (not ZDR). Mechanical rule: provider slug equals the vendor's base slug, or base + "/" + quantization (a serving format, e.g. `moonshotai/int4`, unlike product variants such as `moonshotai/highspeed`).
- No consumer endpoint → blank, never a substitute statistic; refresh warns.
- Revision-pinned OpenRouter ids policy; UI names stay revision-free, mapped id in the Model tooltip.
- Historical entries show current throughput; no provider picker; snapshot refresh stays manual for now (CI automation deferred, will revisit the no-key-in-CI rule then).
