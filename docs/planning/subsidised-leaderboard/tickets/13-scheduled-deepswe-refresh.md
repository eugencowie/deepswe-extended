# 13: Scheduled DeepSWE refresh

Type: task
Status: ready-for-agent
Blocked by: 10

## What to build

A scheduled GitHub Actions workflow that runs the DeepSWE refresh script and opens a pull request when the snapshot changed, keeping a human review between upstream data and `main`. Plus a tweak to the refresh script itself: skip writing when nothing meaningful changed, so no-op upstream churn never reaches the workflow's diff check.

## Decisions (grilled 2026-08-25)

- Scope: DeepSWE only. The OpenRouter refresh (ticket 11) stays manual — scheduling it would put `OPENROUTER_API_KEY` in repo secrets, which the spec rules out. The workflow needs no secrets beyond the PR token.
- Token: a fine-grained PAT (contents + pull-requests write, this repo only) stored as a repo secret, because PRs created with the default `GITHUB_TOKEN` don't trigger the `ready`/`e2e` checks. Provisioned via the wizard skill walking the GitHub UI; ~1-year expiry is an accepted annual chore.
- Cadence: weekly cron plus `workflow_dispatch`, in a separate `.github/workflows/refresh-deepswe.yml` (its triggers and permissions differ from `ci.yml`).
- Skip logic lives in `scripts/refresh-deepswe.ts`, not the workflow: the script compares the fresh snapshot against the checked-in file and leaves it untouched when the only differences are `raw_sha256` and/or `source_generated_at` — both ride along with the next real change. Rationale: upstream regenerates the "live" artifact (observed: a new `mean_cache_tokens` field with identical consumed fields), and the footer date should only advance when the data actually changed. Manual runs get the same behavior for free.
- Branch/PR model: one stable branch (`auto/refresh-deepswe`) force-updated per run, so there is at most one open refresh PR, updated in place. `peter-evans/create-pull-request` handles no-diff runs, branch reuse, and PR creation.
- Guard-rail trips (new unmapped model) fail the workflow run; the failure notification is the alert. No GitHub issue — the repo's tracker is local Markdown.
- No auto-merge: the PR always waits for human review. The refresh job stays minimal (fetch + script + PR); validation is the PR's normal CI.
- Glossary: "Snapshot" reworded in [docs/context.md](../../../context.md) from "refreshed manually" to "refreshed only through human-reviewed commits, never at build or run time" — the invariant is human review and build-time-static data, not who types the command. Spec's refresh-scripts section amended to match.

## Acceptance criteria

- [ ] `vp run refresh:deepswe` leaves the snapshot untouched when only `raw_sha256`/`source_generated_at` differ, and says so; the skip logic is unit-tested
- [ ] `.github/workflows/refresh-deepswe.yml`: weekly cron + `workflow_dispatch`, runs the refresh script, opens/updates a PR on `auto/refresh-deepswe` only when the snapshot changed
- [ ] The PR is created with the PAT secret so `ready`/`e2e` run on it
- [ ] A guard-rail failure (e.g. unmapped model) fails the workflow run without writing anything
- [ ] `vp run ready` passes
