# Research: DeepSWE leaderboard v1.1 data source and semantics

Type: research
Status: open

## Question

Is the DeepSWE leaderboard at <https://deepswe.datacurve.ai> (the **v1.1** table, **all effort levels expanded**) available in a machine-readable form, and what exactly do its numbers mean?

Specifically:

1. **Source format**: Does the site load its table from a JSON endpoint, a public GitHub repo, or embedded page data? Find the most reliable way for a TypeScript refresh script to fetch it. If nothing machine-readable exists, say so plainly — the fallback (manual transcription task) is charted separately.
2. **Capture the data**: Pull the full v1.1 dataset — every (model, effort level) entry with Pass@1, average cost, output tokens, steps — and save it alongside the findings.
3. **Semantics**: What benchmark is Pass@1 over? Is "average cost" per task, and priced at which API rates? Is "output tokens" a per-task average, and does it include reasoning tokens? What is a "step"?
4. **Versioning**: How are leaderboard versions (v1.0/v1.1/…) exposed — can a script target v1.1 explicitly, and detect when a new version lands?

Context: this feeds the spec in ticket 04 and the model mapping. Map: [../map.md](../map.md); decisions so far: [01-charting-grilling.md](01-charting-grilling.md).

Resolve by calling the Skill tool with "research"; capture findings on a `research/deepswe-leaderboard-data` branch.
