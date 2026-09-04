# 01: Deepen the leaderboard module

Type: grilling
Status: needs-triage

## What to build

One module, `src/data/leaderboard.ts`, built once from the four snapshots, that answers every question the render modules used to work out for themselves: rows with their access tag, the Subscriptions picker's tier discounts and usage-limit notes, the model options, filtering with the best-effort view, and the Model-column sort. `derive.ts` and `filter.ts` are absorbed; the table and toolbar stop importing data files.

Recommendation strength at review: Strong. Dependency category: in-process.
