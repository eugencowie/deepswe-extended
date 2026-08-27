# 18: New-model mapping workflow

Type: task
Status: ready-for-agent
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

## Decision (grilled 2026-08-27)

A new model from a known vendor requires no human work beyond merging the Friday PR. Recorded in [ADR 0003](../../../architecture/0003-refresh-generates-mapping-entries.md); spec and glossary amended.

- On an unmapped leaderboard model, the refresh looks it up on the OpenRouter models API, considering only org slugs already present in the mapping. A match means a known vendor: the refresh generates the mapping entry, writes it to `data/model-mapping.json`, and continues. No match means a new vendor: the run fails as today (vendor string, mark, and family are judgment calls).
- Derivation rules:
  - `leaderboardModel`: the artifact row's `model` field, never parsed from `config` (ambiguous: `glm_5_3_max` vs `glm_5_3_flash_max`).
  - `openrouterId`: the OpenRouter id whose suffix, dots normalised to dashes, equals the leaderboard model id (validated against 23/25 existing entries). `null` when the matched listing has dated siblings (revision pinning is a judgment call, ADR 0002 — the undated `deepseek/deepseek-v4-pro` alias points at 0423 while we pin 0813), when the match is absent or ambiguous, or when OpenRouter is unreachable (warn, don't fail). `null` degrades to blank throughput — the reviewer's cue to pin by hand.
  - `displayName`: OpenRouter's `name` minus the `"Vendor: "` prefix, minus a trailing revision token on date-pinned ids (keeps ADR 0002's "no revisions in the UI"). Fallback when there's no match: title-cased leaderboard id.
  - `vendor`, `family`: copied from existing entries with the same org slug — never from OpenRouter's vendor prefix (it says "SpaceXAI" for xAI).
  - `usageMultiplier`: 1.0; no `shortName`. A future half-rate model merging at 1.0 is the reviewer's catch.
- The workflow's `create-pull-request` step adds `data/model-mapping.json` to `add-paths`, so one PR carries snapshot and mapping together.
- Display-name alignment: the derivation becomes the definition, so `GLM-5.3` → `GLM 5.3` and `GLM-5.2` → `GLM 5.2` in the mapping (and the spec's mirror table). The other 23 entries already match; DeepSeek names stay revision-free.
- Immediate case: `glm-5-3-flash` is deliberately **not** hand-added. After this lands, a manual `workflow_dispatch` run is the acceptance test: its PR must contain the generated entry.

## Completion criteria

- The refresh generates mapping entries per the decision above; the new-vendor case still fails with the existing actionable error.
- Tests cover the derivation rules: known-vendor match, dated-siblings → `null`, ambiguous/absent match → `null`, OpenRouter unreachable → `null` with warning, new vendor → hard failure.
- `.github/workflows/refresh.yml` includes `data/model-mapping.json` in `add-paths`.
- `GLM-5.3` and `GLM-5.2` display names become `GLM 5.3` and `GLM 5.2` in `data/model-mapping.json` and the spec's mapping table.
- No hand-written `glm-5-3-flash` entry. Post-merge verification: a `workflow_dispatch` run opens a PR whose mapping entry is `glm-5-3-flash` / `GLM 5.3 Flash` / `Z.ai` / `z-ai/glm-5.3-flash` / `none` / `1.0` (id verified live on OpenRouter) and whose snapshot has 63 rows including `mini_swe_agent_glm_5_3_flash_max`.
- `mise exec -- vp check` and `mise exec -- vp test` pass.
