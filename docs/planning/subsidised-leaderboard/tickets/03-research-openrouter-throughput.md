# Research: OpenRouter throughput data access

Type: research
Status: resolved

## Question

How does a script get a **tokens-per-second throughput figure per model** out of OpenRouter?

Specifically:

1. **API surface**: Does OpenRouter's public API expose throughput (the number shown on model pages), or only the frontend? Which endpoint(s), what auth, what rate limits? If only a frontend/undocumented API exists, assess how stable it looks.
2. **Shape**: Is throughput reported per provider, per endpoint, or aggregated per model? If per provider, confirm the plan of taking a **median across providers** is workable, or recommend better (e.g. OpenRouter's own default-routing figure).
3. **Semantics**: What does the figure measure — generation tokens/sec only? Are reasoning tokens included? Over what time window is it averaged? Note anything that would skew "output tokens ÷ throughput" as a time estimate.
4. **Capture**: Fetch current throughput for the frontier-lab models likely on the DeepSWE leaderboard (OpenAI GPT/Codex families, Anthropic Claude, Google Gemini, plus prominent open-weight coding models) and save the numbers with the findings. Note any leaderboard-relevant models OpenRouter does not list at all.

Context: this feeds average time in the spec (ticket 04) and the model mapping. Map: [../map.md](../map.md); decisions so far: [01-charting-grilling.md](01-charting-grilling.md).

Resolve by calling the Skill tool with "research"; capture findings on a `research/openrouter-throughput` branch.

## Answer

Resolved on 2026-08-20. The full findings and point-in-time model snapshot are in [OpenRouter throughput research](../research/openrouter-throughput.md).

Use OpenRouter's documented `GET /api/v1/models/{author}/{slug}/endpoints` endpoint with a bearer API key. It returns 30-minute throughput percentiles for each provider endpoint. Unauthenticated calls return the endpoint list but leave throughput and latency as `null`. OpenRouter does not publish a separate numeric limit for this route, so the refresh script should handle HTTP 429 responses and `Retry-After`.

For the leaderboard, use the unweighted median of the non-null default-tier endpoint p50 values. The headline number on a model page is the fastest provider's p50, which can be distorted by endpoints with only a handful of recent requests. OpenRouter's normal price-weighted routing does not expose one aggregate throughput figure.

Throughput is output tokens divided by generation time, including fetch latency, time to first token, and streaming time. Reasoning tokens are output tokens in OpenRouter's accounting, but the throughput pipeline does not document its reasoning-token numerator precisely. Average time remains a rough estimate because it omits tool work and gaps between the benchmark's many model calls.

All 25 models in the current DeepSWE v1.1 artifact have exact OpenRouter listings. The report records their mappings, provider medians, page-best values, ranges, sample coverage, and three additional Codex-family references.
