# 07: Average time via OpenRouter throughput

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

Each row gains "Tok/s (est)" and "Avg time (est)" columns: average time is output tokens ÷ the model's OpenRouter median throughput, displayed as `Xm Ys`. Both headers carry the "(est)" suffix and a tooltip marking them estimates (Avg time: excludes tool execution and gaps between the agent's calls). The footer gains its second line: the OpenRouter capture date.

Per the [spec](../spec.md): the throughput snapshot (seeded from the research capture's medians) is checked in and joined through the model mapping; effort levels share one figure. A model with no OpenRouter id or no snapshot entry gets blank ("–") throughput and time, and blanks sort last in both directions — the comparator from ticket 06 applies to every column.

## Acceptance criteria

- [ ] "Tok/s (est)" and "Avg time (est)" columns render with `Xm Ys` time formatting and estimate tooltips on both headers
- [ ] Blank cells show "–" and sort last whichever direction the sort runs
- [ ] Footer shows the OpenRouter capture date alongside the DeepSWE snapshot date
- [ ] Spot check: a model's rows at all effort levels share one throughput figure
- [ ] Unit tests cover time derivation and blank propagation (null OpenRouter id, missing snapshot entry)
- [ ] `vp run ready` passes and the deployed site shows the new columns
