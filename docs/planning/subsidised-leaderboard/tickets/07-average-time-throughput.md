# 07: Average time via OpenRouter throughput

Type: task
Status: resolved
Blocked by: 06

## What to build

Each row gains "Tok/s (est)" and "Avg time (est)" columns: average time is output tokens ÷ the model's OpenRouter median throughput, displayed as `Xm Ys`. Both headers carry the "(est)" suffix and a tooltip marking them estimates (Avg time: excludes tool execution and gaps between the agent's calls). The footer gains its second line: the OpenRouter capture date.

Per the [spec](../spec.md): the throughput snapshot (seeded from the research capture's medians) is checked in and joined through the model mapping; effort levels share one figure. A model with no OpenRouter id or no snapshot entry gets blank ("–") throughput and time, and blanks sort last in both directions — the comparator from ticket 06 applies to every column.

## Acceptance criteria

- [x] "Tok/s (est)" and "Avg time (est)" columns render with `Xm Ys` time formatting and estimate tooltips on both headers
- [x] Blank cells show "–" and sort last whichever direction the sort runs
- [x] Footer shows the OpenRouter capture date alongside the DeepSWE snapshot date
- [x] Spot check: a model's rows at all effort levels share one throughput figure
- [x] Unit tests cover time derivation and blank propagation (null OpenRouter id, missing snapshot entry)
- [x] `vp run ready` passes and the deployed site shows the new columns (passes locally; deploy pending merge to main)

## Comments

**Grilling decisions (2026-08-24):**

- `Xm Ys` is the only time format: seconds round to nearest, minutes ride past 60 ("64m 10s", no hours unit), and sub-minute values keep the zero minute ("0m 45s"). Seed data spans 1m 14s (Luna low) to 58m 2s (Sonnet 5 max), so the hour boundary is one refresh away.
- Tooltip wordings — Tok/s: "Median throughput on OpenRouter, not the speed measured in the benchmark run" (the key message is provenance: OpenRouter data, not the benchmark run's own speed). Avg time extends the spec's wording with the formula: "Output tokens ÷ OpenRouter median throughput; excludes tool execution and gaps between the agent's calls".
- The seed snapshot stores `medianP50` only. The research capture recorded no per-endpoint values, so the spec type's `endpoints` array moves to ticket 11, whose refresh script actually produces it — checked-in data shouldn't contain fabricated empties.
- Footer line mirrors the DeepSWE one: "OpenRouter throughput snapshot, {UTC date of capturedAt}", linked to openrouter.ai. Seed `capturedAt` is 2026-08-20T14:50:24Z, the start of the research capture's fetch window.
- Throughput always renders one decimal ("40.0"), keeping the right-aligned column unragged.
- Column order follows the spec (Avg time before Tok/s); the ticket title's reverse order was incidental phrasing.
