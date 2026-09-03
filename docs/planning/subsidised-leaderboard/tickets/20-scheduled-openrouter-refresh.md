# 20: Scheduled OpenRouter refresh

Type: task
Status: resolved
Blocked by: 11

## What to build

Extend the scheduled refresh workflow (`.github/workflows/refresh.yml`, ticket 13) to run the OpenRouter throughput refresh on the weekly cron and `workflow_dispatch`, with `OPENROUTER_API_KEY` supplied as a repo secret, landing snapshot changes only through a human-reviewed pull request that triggers CI — same review gate as the DeepSWE refresh.

This deliberately reverses ticket 13's manual-only scope and the spec's "never in repo secrets or CI" rule (decided 2026-08-27 in [ticket 11](11-openrouter-refresh-script.md)'s grilling). The invariant that survives is narrower: the key is never committed, and refreshes still reach `main` only as human-reviewed commits.

Notes for whoever picks this up:

- Secret provisioning is a human step (wizard-style, like ticket 13's `REFRESH_PR_TOKEN`).
- Unlike the DeepSWE refresh there is no meaningful-change skip: the 30-minute statistic changes every run, so a weekly PR with ~25 one-line value changes is the expected steady state (ticket 11 decision).
- Open design decisions, to grill before building: separate job vs. an extra step; its own PR branch (`refresh/openrouter`) vs. folding into the existing weekly PR; what a hard-error run should look like when the DeepSWE half succeeded.

## Decisions (grilled 2026-08-27)

- Shape: a second parallel job `refresh-openrouter` in `refresh.yml`, own branch `refresh/openrouter`, own PR (`chore:` title and label, `add-paths: data/openrouter-throughput.json`). The halves have different rhythms — DeepSWE skips no-op weeks while OpenRouter changes every run — so folding them would drag a sometimes-empty diff along with a guaranteed one, and one half's stale unmerged PR would block clean review of the other. Job independence also answers the hard-error question: a tripped guard rail fails its job red without writing while the other job proceeds.
- PR body: `refresh-openrouter.ts` emits a `GITHUB_OUTPUT` summary — before/after model count (the ADR 0004 acknowledgement role; `openrouter-throughput.json` has no load-time invariants), `capturedAt`, and every snapshot warning (omissions and disappearances with previous values; 429 retry notices stay in the run log — a retry that succeeded changed nothing the reviewer must acknowledge, and persistent 429 trouble surfaces as a failed job). Without this, the scheduled path would silently defeat ticket 11's "the old number lives in the review" decision: nobody reads the logs of a green run. No per-model value table — the diff carries the ~26 lines of rolling-30-minute jitter, and restating it would train reviewers to skim.
- `workflow_dispatch` runs both halves, no input: each is cheap and idempotent, and targeted refreshes remain available locally.
- Secret provisioning: a single `gh secret set OPENROUTER_API_KEY` from the local `.env`, run by the agent with the user's sign-off (given in grilling) — no wizard; ticket 13's PAT wizard existed for a multi-step dashboard walk, and this is one command.

## Acceptance criteria

- [x] Weekly scheduled run executes `vp run refresh:openrouter` with `OPENROUTER_API_KEY` from a repo secret; the key never appears in the repo or in logs
- [x] Snapshot changes reach `main` only through a human-reviewed PR on which `ready`/`e2e` run
- [x] A guard-rail hard error fails the workflow run without writing anything
- [x] `vp run ready` passes

## Comments

**2026-08-27 (implementation):** Built per the Decisions: `refresh.yml` gains the parallel `refresh-openrouter` job (checkout → setup-vp → `vp run refresh:openrouter` with the secret in the step env → `create-pull-request` on `refresh/openrouter`, PAT token so `ready`/`e2e` run, `chore` title/label, `add-paths: data/openrouter-throughput.json`). `refresh-openrouter.ts` now emits the `GITHUB_OUTPUT` summary (before/after model count, `capturedAt`, all warnings), spliced into the PR body under review guidance that names the jitter and the disappeared-model rule. Guard rails were verified in ticket 11 (any hard error aborts before writing; the job then fails red while `refresh-deepswe` proceeds). `OPENROUTER_API_KEY` set as a repo secret from the local `.env` via `gh secret set` — the first attempt's `mise exec -- node` failed and piped nothing, briefly leaving an empty secret; re-set seconds later with an empty-value guard, confirmed by `gh secret list` timestamps. The key never appears in output; Actions masks the secret in logs and the script only sends it as a bearer header. `vp run ready` passes (105 tests). Remaining human step, as with ticket 13: merge, then optionally test-drive with `gh workflow run refresh.yml`.

**2026-08-27 (code review):** Two-axis review of the branch against `main`, findings grilled and settled. Fixed: a corrupt checked-in snapshot now hard-errors instead of silently disabling the ADR 0002 disappearance audit (only a missing file means first run); the service-tier filter is case-insensitive, finishing ticket 11's "case-insensitive on both sides" decision; both refresh scripts use a unique random `GITHUB_OUTPUT` heredoc delimiter per GitHub's output-injection guidance; ADR 0004's "hand-maintained" description of `openrouter-throughput.json` amended; the spec's no-diff-after-commit criterion rescoped to the DeepSWE half (the OpenRouter write policy makes it unsatisfiable). Declined: splicing 429 retry notices into the PR body (Decisions wording tightened to "every snapshot warning" instead); reverting the one-time snapshot reformat and the `labels: chore` rideshare (both documented, both accepted). Possible follow-up, deliberately not done here: `refresh-deepswe.ts` shares the old read-failure-to-`null` shape, but its failure mode is a disabled meaningful-change skip, not a lost audit trail.

**2026-09-03** — The two-jobs-two-PRs decision was reversed in [ticket 21](21-single-refresh-pr.md): one sequential job and a single Refresh PR, because the parallel OpenRouter job ran against the mapping before the DeepSWE half's generated entries existed, leaving each new model without throughput until a manual re-run.
