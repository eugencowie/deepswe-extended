# 17: Handle null DeepSWE job finish time

Type: task
Status: resolved
Blocked by: none

## Incident

The manually dispatched DeepSWE refresh failed on 2026-08-27:

- Workflow run: <https://github.com/eugencowie/deepswe-extended/actions/runs/33029663809/job/98379004015>
- Commit: `00ddd52155fd4aada46fa6687aeab0417e6ff40f`
- Failure: `latest_job.finished_at` was `null`, while `leaderboardArtifactSchema` requires a string

The live artifact was generated at `2026-08-26T07:38:24.821609+00:00` and contained:

```json
{
  "latest_job": {
    "name": "20260825-deep-swe-glm-5-3-flash",
    "finished_at": null
  }
}
```

The previous workflow run succeeded on 2026-08-25. It fetched an artifact generated on 2026-08-20 whose latest job had a finish timestamp. The relevant validation contract did not change between the successful and failed runs.

## Reproduction

Run:

```sh
mise exec -- vp run refresh:deepswe
```

Current result:

```text
ZodError: Invalid input: expected string, received null
path: latest_job.finished_at
```

The failure reproduced on three consecutive runs. The live artifact still contained `null` at the end of the investigation.

## Findings

`finished_at` has no effect on the UI or leaderboard calculations. Within this repository it is only:

- validated by `leaderboardArtifactSchema`;
- copied into `DeepsweSnapshot.source_latest_job` as provenance;
- declared as a string in the snapshot type and planning documents;
- included in `hasMeaningfulChange`, so a changed job reference can trigger a snapshot write even when consumed leaderboard values are unchanged.

The app derives rows from `snapshot.entries`. Its displayed snapshot date comes from `source_generated_at`, not `source_latest_job.finished_at`.

The hard failure was deliberate. Ticket 10 records a null latest job as a guard-rail failure because the checked-in snapshot type requires a completed job reference. A null finish time may mean the upstream job is incomplete, but the upstream contract has not been confirmed.

Accepting null does not make the current refresh pass. Bypassing the schema check reaches the next guard rail:

```text
Leaderboard model(s) missing from data/model-mapping.json: glm-5-3-flash.
```

The current artifact has 63 rows versus 62 in the checked-in snapshot. It adds `mini_swe_agent_glm_5_3_flash_max` and removes no configurations. Refreshing it requires a mapping decision for `glm-5-3-flash`: display name, vendor, OpenRouter id, subscription family, and usage multiplier.

## Decision needed

Choose the meaning of a null `finished_at` before changing the schema:

1. Treat null as "upstream snapshot not ready." Keep the completed-job invariant, but replace the raw Zod error with a clear skip or purpose-built failure. A skip should exit successfully only if missing an update is preferable to an alert.
2. Accept null as valid provenance. Change the Zod schema, `DeepsweSnapshot` type, tests, spec, and research capture. Decide whether changes to `source_latest_job` alone should remain meaningful enough to create a refresh PR.
3. Ask DeepSWE to publish the latest completed job or confirm that leaderboard rows are complete while `finished_at` is null.

The current evidence supports option 1 until the upstream semantics are known. Option 2 is safe for the app itself, but it weakens the only completed-job guard rail and could snapshot results while an upstream job is changing.

## Completion criteria

- The null semantics are documented.
- The refresh handles null with a deliberate message and exit behavior.
- Tests cover the chosen null behavior and whether job-only changes are meaningful.
- The `glm-5-3-flash` mapping is added or the refresh continues to fail with the existing actionable mapping error.
- `mise exec -- vp run refresh:deepswe` reaches the intended outcome against the live artifact.
- `mise exec -- vp check` and `mise exec -- vp test` pass.

## Investigation notes

No repository code or data files were changed during diagnosis. No debug instrumentation or temporary files remain.

## Decision (grilled 2026-08-27)

Option 2: a null `finished_at` is valid provenance. DeepSWE displays the entry on its own leaderboard while the job runs, so we snapshot what it shows; if results later change, a future refresh picks them up. No upstream contact — a response isn't expected.

- Schema widens only for the observed state: `finished_at` becomes nullable, the `latest_job` object stays required (an absent job has never been observed and stays a loud failure).
- `source_latest_job` stays in the snapshot as provenance but is excluded from `hasMeaningfulChange`: the app never reads it, so a job-only change no longer triggers a snapshot PR.
- The `glm-5-3-flash` mapping is out of scope — [ticket 18](18-new-model-mapping-workflow.md) decides how new models are handled going forward, including whether the refresh can auto-populate mapping entries. Until then the refresh fails on the existing actionable mapping error, and the scheduled run's failure email is the designed alert.

## Comments

**2026-08-27** — Implemented: `finished_at` nullable in `leaderboardArtifactSchema` and `DeepsweSnapshot`; `source_latest_job` excluded from `hasMeaningfulChange`; tests cover null acceptance, absent-job rejection, and job-only non-meaningful change. Spec, ticket 10, and the research capture updated to match. Against the live artifact the refresh now reaches the intended outcome: the actionable `glm-5-3-flash` mapping error.
