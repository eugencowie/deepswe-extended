# 10: DeepSWE refresh script

Type: task
Status: ready-for-agent
Blocked by: 06

## What to build

Running the DeepSWE refresh script updates the checked-in leaderboard snapshot from the live source: it fetches the versions manifest and the pinned v1.1 artifact, validates the schema, rejects duplicate configurations, applies the checked-in display-cost-factor table, and keeps raw values beside adjusted ones — per the refresh strategy in the [research findings](../research/deepswe-leaderboard-data.md) and the [spec](../spec.md) (Refresh scripts, version-bump workflow).

Guard rails: warn without switching when the manifest's `latest` moves past v1.1; fail when a fetched model is missing from the model mapping, so new leaderboard models force a mapping decision.

## Acceptance criteria

- [ ] Script fetches live source, validates, and writes the snapshot in the checked-in shape
- [ ] Display-cost factors (Luna 0.2, Terra 0.8, Gemini 3.6 Flash 0.5) applied; raw values and factors retained
- [ ] Rerun immediately after committing a snapshot produces no diff (modulo the source timestamp)
- [ ] A fetched model absent from the mapping fails the run with a clear message
- [ ] A manifest `latest` ≠ v1.1 warns but stays pinned
- [ ] `vp run ready` passes
