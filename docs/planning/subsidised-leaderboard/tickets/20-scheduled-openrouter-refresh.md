# 20: Scheduled OpenRouter refresh

Type: task
Status: ready-for-agent
Blocked by: 11

## What to build

Extend the scheduled refresh workflow (`.github/workflows/refresh.yml`, ticket 13) to run the OpenRouter throughput refresh on the weekly cron and `workflow_dispatch`, with `OPENROUTER_API_KEY` supplied as a repo secret, landing snapshot changes only through a human-reviewed pull request that triggers CI — same review gate as the DeepSWE refresh.

This deliberately reverses ticket 13's manual-only scope and the spec's "never in repo secrets or CI" rule (decided 2026-08-27 in [ticket 11](11-openrouter-refresh-script.md)'s grilling). The invariant that survives is narrower: the key is never committed, and refreshes still reach `main` only as human-reviewed commits.

Notes for whoever picks this up:

- Secret provisioning is a human step (wizard-style, like ticket 13's `REFRESH_PR_TOKEN`).
- Unlike the DeepSWE refresh there is no meaningful-change skip: the 30-minute statistic changes every run, so a weekly PR with ~25 one-line value changes is the expected steady state (ticket 11 decision).
- Open design decisions, to grill before building: separate job vs. an extra step; its own PR branch (`refresh/openrouter`) vs. folding into the existing weekly PR; what a hard-error run should look like when the DeepSWE half succeeded.

## Acceptance criteria

- [ ] Weekly scheduled run executes `vp run refresh:openrouter` with `OPENROUTER_API_KEY` from a repo secret; the key never appears in the repo or in logs
- [ ] Snapshot changes reach `main` only through a human-reviewed PR on which `ready`/`e2e` run
- [ ] A guard-rail hard error fails the workflow run without writing anything
- [ ] `vp run ready` passes
