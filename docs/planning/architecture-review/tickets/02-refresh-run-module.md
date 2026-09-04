# 02: Put a refresh run behind each shell script

Type: grilling
Status: needs-triage

## Question

`scripts/refresh-deepswe.ts` and `scripts/refresh-openrouter.ts` export nothing: 265 lines of orchestration (fetch, retry loop, 404 rule, `.env` loading, existing-snapshot read with two different error policies, write ordering, the no-change short-circuit, the GitHub summary with its heredoc delimiter) sit behind no interface, so nothing can test them. The guarantees ADR 0003 and ADR 0004 lean on ("written only after normalize succeeds", "the summary always reaches the PR body") exist only as comments.

Recommendation strength at review: Strong. Dependency category: ports and adapters (fetch, data store) plus local-substitutable (clock, `GITHUB_OUTPUT` sink).

## Shape to grill

- Each refresh becomes a run function taking fetch, a data-file reader and writer, a clock and an output sink, returning the outcome (wrote or unchanged, generated entries, warnings, summary). The shell shrinks to building the production adapters and calling run.
- Two adapters per seam justify it: global fetch and `data/*.json` in production, in-memory in tests.
- Whole-run tests: 429 then success, the 404 mapping-is-wrong message, unchanged leaves the file untouched, a normalize failure writes neither the mapping nor the snapshot.
- The mapping read should parse with the app's `modelMappingSchema` rather than a cast, so the refresh validates what it writes.
- Ticket 05 (shared summary and provenance) folds in here.

## Open questions

- One run module with two source plug-ins, or two run modules sharing a commons module?
- Does the data store seam cover only `data/*.json`, or the `.env` read as well?
- Does the retry policy (attempts, backoff) become part of the interface or stay internal?
