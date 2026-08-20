# 07: Average time via OpenRouter throughput

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

Each row gains Throughput (tok/s) and Avg time columns: average time is output tokens ÷ the model's OpenRouter median throughput, displayed as `Xm Ys` with a tooltip marking it an estimate (excludes tool execution and gaps between the agent's calls).

Per the [spec](../spec.md): the throughput snapshot (seeded from the research capture's medians) is checked in and joined through the model mapping; effort levels share one figure. A model with no OpenRouter id or no snapshot entry gets blank ("–") throughput and time, and blanks sort last in both directions — the comparator applies to every column.

## Acceptance criteria

- [ ] Throughput and Avg time columns render with `Xm Ys` formatting and the estimate tooltip
- [ ] Blank cells show "–" and sort last whichever direction the sort runs
- [ ] Spot check: a model's rows at all effort levels share one throughput figure
- [ ] Unit tests cover time derivation and blank propagation (null OpenRouter id, missing snapshot entry)
- [ ] `vp run ready` passes and the deployed site shows the new columns
