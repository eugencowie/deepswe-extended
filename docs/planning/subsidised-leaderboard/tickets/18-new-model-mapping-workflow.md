# 18: New-model mapping workflow

Type: task
Status: needs-triage
Blocked by: none

## Problem

When the DeepSWE leaderboard gains a model that isn't in `data/model-mapping.json`, the refresh fails by design and the scheduled run emails a failure until a human adds the mapping. That happened on 2026-08-27 with `glm-5-3-flash` ([ticket 17](17-handle-null-latest-job-finished-at.md)); the mapping was deliberately left out of that ticket's scope.

Every Friday cron run fails with the mapping error until this ticket lands.

## Decide

How new leaderboard models are handled going forward:

- Can the refresh auto-populate a mapping entry (display name, vendor, OpenRouter id, subscription family, usage multiplier) so the run produces a PR instead of failing? PR review would remain the check that the determined values are correct.
- Which fields can be determined automatically and which need a human default (e.g. family `none`, multiplier `1.0`)?
- A new vendor also requires a vendor-mark entry in `src/components/vendor-mark-svgs.ts` (enforced by test); decide whether that stays a manual step that fails the run.

## Immediate case

`glm-5-3-flash` needs a mapping entry: display name, vendor (Z.ai — vendor mark already exists), OpenRouter id, subscription family, usage multiplier. The live artifact has 63 rows vs the checked-in 62; the new configuration is `mini_swe_agent_glm_5_3_flash_max`.

## Completion criteria

- The new-model workflow is decided and documented.
- The `glm-5-3-flash` mapping exists and `mise exec -- vp run refresh:deepswe` succeeds against the live artifact.
- `mise exec -- vp check` and `mise exec -- vp test` pass.
