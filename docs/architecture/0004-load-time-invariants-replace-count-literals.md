# Load-time invariants replace snapshot count literals

The test suite pinned snapshot sizes as literals: 185 derived rows and a 63/60 Claude/ChatGPT tier split in `src/data/derive.test.ts`, 62 entries and 25 models in `src/data/filter.test.ts`. The derive literal was a deliberate spot-check so the relationship-based count (computed from the same inputs it validates) was not purely self-confirming. But the scheduled refresh stages only the two data files, so the first refresh that added a model opened with failing CI (PR 18, `glm-5-3-flash`, 2026-08-27) — re-introducing, one layer down, exactly the routine-growth failure ADR 0003 removed. We decided tests never assert snapshot sizes. The independence the literals bought comes instead from load-time invariants in `src/data/schema.ts`, parsed in `src/data/sources.ts`: no duplicate `(model, effort)` identity in the snapshot, no duplicate mapping key, and model↔mapping coverage in both directions. The human-acknowledgement role moves to review: the Refresh PR body carries a before/after count table emitted by `scripts/refresh-deepswe.ts`.

## Considered options

- **Keep the red gate**: the reviewer verifies the diff and pushes new literals to the refresh branch. Preserves an independent check but makes every healthy refresh open red, which re-litigates ADR 0003 and trains reviewers to expect failing CI.
- **Have the refresh rewrite the literals**: keeps CI green, but the same command then produces both the data and its expected counts, so the check only catches drift between two outputs of one script.
- **A minimum-count floor** alongside the invariants: catches a truncated fetch, but a magic floor is a smaller version of the literal problem, and a truncated snapshot is unmissable in the PR's data diff.

## Consequences

- A healthy Refresh PR is green whatever the leaderboard's size; red CI on a refresh now signals malformed output, not growth.
- Malformed committed data fails at module load in production too, with a schema error naming the field, not only in tests. `tiers.json` (hand-maintained) and `openrouter-throughput.json` (script-refreshed since ticket 20) stay plain casts.
- The reviewer's count acknowledgement lives in the PR body table; nothing forces them to read it.
- Value-asserting tests use fixtures per `derive.test.ts`'s existing convention; live-data tests assert structure only, now without exceptions.
