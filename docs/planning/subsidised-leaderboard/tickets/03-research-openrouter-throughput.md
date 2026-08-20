# Research: OpenRouter throughput data access

Type: research
Status: open

## Question

How does a script get a **tokens-per-second throughput figure per model** out of OpenRouter?

Specifically:

1. **API surface**: Does OpenRouter's public API expose throughput (the number shown on model pages), or only the frontend? Which endpoint(s), what auth, what rate limits? If only a frontend/undocumented API exists, assess how stable it looks.
2. **Shape**: Is throughput reported per provider, per endpoint, or aggregated per model? If per provider, confirm the plan of taking a **median across providers** is workable, or recommend better (e.g. OpenRouter's own default-routing figure).
3. **Semantics**: What does the figure measure — generation tokens/sec only? Are reasoning tokens included? Over what time window is it averaged? Note anything that would skew "output tokens ÷ throughput" as a time estimate.
4. **Capture**: Fetch current throughput for the frontier-lab models likely on the DeepSWE leaderboard (OpenAI GPT/Codex families, Anthropic Claude, Google Gemini, plus prominent open-weight coding models) and save the numbers with the findings. Note any leaderboard-relevant models OpenRouter does not list at all.

Context: this feeds average time in the spec (ticket 04) and the model mapping. Map: [../map.md](../map.md); decisions so far: [01-charting-grilling.md](01-charting-grilling.md).

Resolve by calling the Skill tool with "research"; capture findings on a `research/openrouter-throughput` branch.
