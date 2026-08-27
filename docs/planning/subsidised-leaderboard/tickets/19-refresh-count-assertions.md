# 19: Keep refresh snapshot counts in sync

Type: task
Status: resolved
Blocked by: none

## Incident

The first refresh PR produced by the known-vendor mapping workflow failed its `ready` job on 2026-08-27:

- Pull request: <https://github.com/eugencowie/deepswe-extended/pull/18>
- Workflow job: <https://github.com/eugencowie/deepswe-extended/actions/runs/33038737810/job/98407287223>
- PR commit: `349986a4ae60dc27ef80d5b9b71d676237f74c69`
- Base commit: `fabec10a80f915a9760336c015b2b05df012612b`

`vp check` passed. `vp test` failed four assertions in `src/data/derive.test.ts` and `src/data/filter.test.ts`. Each assertion expected the previous snapshot's fixed row or model count.

## Findings

The refresh correctly added one leaderboard entry and its generated mapping for `glm-5-3-flash`. The mapping assigns it to subscription family `none`, so it contributes one API row and no tier rows. There is no duplicate data, and every relationship-based check passes at the PR commit; only fixed snapshot-size literals are stale.

The data changed as follows:

| Measure | Base | PR |
| --- | ---: | ---: |
| Leaderboard entries | 62 | 63 |
| Unique `(model, effort)` identities | 62 | 63 |
| Unique models | 25 | 26 |
| Mapping entries | 25 | 26 |
| Derived rows | 185 | 186 |

The scheduled refresh (`.github/workflows/refresh.yml`) stages only `data/deepswe-v1.1.json` and `data/model-mapping.json`, so any refresh that changes the number of entries or models opens with failing CI.

The full inventory of refresh-fragile literals is larger than the four failing assertions:

- `src/data/derive.test.ts:40` — 185 derived rows (comment: "Literal spot-check so the count isn't purely self-confirming").
- `src/data/derive.test.ts:45-50` — 63/60 Claude/ChatGPT tier split. Passed this time only because the new model has no tiers; the next refresh that adds a tiered model breaks it the same way.
- `src/data/filter.test.ts` — 25 models and 62 entries, each pinned twice, plus the picker test comment citing 62/25.

Coverage gaps found during diagnosis: nothing asserts unique `(model, effort)` identities in the committed snapshot or unique model-mapping keys (the only duplicate check, `scripts/deepswe-snapshot.test.ts:157-162`, guards the fetched artifact, not the committed files). Mapping coverage is checked in one direction only. `src/data/sources.ts:13-15` plain-casts both JSON files with no schema validation, so malformed committed data reaches production unchecked.

## Decisions (2026-08-27)

ADR 0003 already decided that routine leaderboard growth must not produce a red weekly result, with PR review as the check. The fixed count literals reintroduced that failure mode one layer down. Accordingly:

1. **Remove every refresh-fragile literal**, including the 63/60 tier split. Rejected alternatives: keeping a red gate the reviewer resolves by pushing new literals (re-litigates ADR 0003, trains reviewers to expect red CI), and having the refresh rewrite the literals (the same command would produce both the data and its expected counts, so the check would no longer be independent).
2. **Replace them with growth-proof invariants**: unique `(model, effort)` identities in the snapshot, unique mapping keys, and bidirectional model↔mapping coverage. Existing relationship checks stay. No minimum-count floor: a magic floor is a smaller version of the literal problem, and a truncated snapshot is unmissable in the PR's data diff.
3. **Enforce the invariants at load, not only in tests.** A Zod schema with uniqueness refinements parses both JSON files in `src/data/sources.ts`, replacing the plain casts. Tests exercise the load and keep the relationship checks. Zod 4 is already a dependency (`scripts/deepswe-snapshot.ts`, `scripts/mapping-generation.ts`).
4. **The tier-split test becomes structural**: each tier row's family matches its mapping entry, per the file's own stated philosophy that live-data tests assert structure only (`src/data/derive.test.ts:15-17`).
5. **The refresh PR body gains an old→new count summary** (entries, models, generated mappings) via the inline body in `refresh.yml:24-31`. This moves the human-acknowledgement role of the literals to review, where ADR 0003 put it. No test step is added to the refresh job; CI already runs the identical suite on the PR.
6. **Record the rationale as ADR 0004** ("snapshot-size literals removed in favor of load-time invariants" or similar), with a pointer comment in each affected test file (one per file; repeating it at every former assertion site is comment noise).
7. **PR 18 is left untouched.** After this ticket merges, a human re-runs the refresh workflow, which updates the existing PR branch and goes green.

## Completion criteria

- ADR 0004 records why fixed snapshot-size checks were removed and what replaced them; each affected test file carries a pointer comment.
- No test asserts a literal snapshot count; the tier-split test asserts structure.
- `src/data/sources.ts` parses both data files with a Zod schema that rejects duplicate `(model, effort)` identities, duplicate mapping keys, and models missing from the mapping in either direction.
- The generated refresh PR body summarizes old→new entry, model, and mapping counts.
- `mise exec -- vp check` and `mise exec -- vp test` pass.

## Post-merge human step

Manually re-run the refresh workflow so PR 18's branch is regenerated on top of the fix and CI goes green. Do not push count updates to PR 18 directly.

## Investigation notes

No production code or data files changed during diagnosis. The temporary worktrees and test-output files were removed.

## Comments

2026-08-27: Implemented. ADR 0004 (`docs/architecture/0004-load-time-invariants-replace-count-literals.md`); load-time schema in `src/data/schema.ts` parsed by `src/data/sources.ts`, with rejection tests in `src/data/schema.test.ts`; all snapshot-count literals removed from `derive.test.ts` and `filter.test.ts` (tier-split test is now structural); refresh PR body gains a before/after count table via a `summary` step output. `vp run ready` passes (87 tests). Remaining human step: re-run the refresh workflow after merge so PR 18 goes green.

2026-08-27: Code review (standards + spec). Fixed: the tier-row test now cross-checks family against the mapping instead of restating derive's construction rule, and `assertMappingCoverage`'s message assembly was tidied. Accepted with rationale: field-level schema validation stays (unchecked casts were the gap this ticket closed); decision 6 relaxed to one pointer comment per affected test file. Remaining smells (duplicate-refinement helper, shared model-count) accepted per the rule of three.
