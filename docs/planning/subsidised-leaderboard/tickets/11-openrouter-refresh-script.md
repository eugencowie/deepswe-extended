# 11: OpenRouter refresh script

Type: task
Status: ready-for-agent
Blocked by: 07

## What to build

Running the OpenRouter refresh script updates the checked-in throughput snapshot: for every mapped model it calls the documented model-endpoints API with a bearer key, selects the vendor's consumer endpoint per [ADR 0002](../../../architecture/0002-throughput-consumer-endpoint.md), and writes all models in one run under a single capture timestamp — per the reproducible fetch in the [research findings](../research/openrouter-throughput.md) and the [spec](../spec.md).

Consumer-endpoint selection reads `data/vendor-mapping.json` (new in this ticket): an array of records keyed by the exact `vendor` strings in `model-mapping.json`, each with a consumer provider slug or `null` for a vendor that deliberately runs no consumer endpoint. The script matches the slug exactly against standard-variant endpoints. Seed the file from the frontend-feed research and commit it; the first keyed run verifies the seeds.

Guards: a mapped model id missing from OpenRouter is a hard error (the mapping is wrong — ids are revision-pinned); a vendor present in `model-mapping.json` but absent from `vendor-mapping.json` is a hard error (forgot-to-map, distinct from decided-no-endpoint); more than one standard-variant endpoint matching a vendor's slug is a hard error (a human decides which is the consumer endpoint); zero matches for a non-null slug, or a `null` slug, is a warning and the model is omitted from the snapshot (blank in the UI — this happened to the unpinned DeepSeek V4 Pro listing between 2026-08-20 and 08-25).

Key handling: `OPENROUTER_API_KEY` from a gitignored local env file, never in CI; a missing key or all-null throughput (the unauthenticated symptom) is a hard error. Handle 429 with `Retry-After`. This first keyed run also verifies the documented API path, which the seed and 2026-08-25 snapshots (frontend feed) never exercised — flag any discrepancy against the research findings.

## Acceptance criteria

- [ ] `data/vendor-mapping.json` covers every vendor in `model-mapping.json`, seeded from the research; refresh hard-fails on a missing vendor or an ambiguous slug match
- [ ] Script writes the snapshot in the checked-in shape: per-model median plus raw endpoint values, one `capturedAt`
- [ ] Missing key and all-null throughput each fail with a clear message
- [ ] Flex/priority service-tier endpoints excluded from selection
- [ ] 429 responses respected via `Retry-After`
- [ ] First keyed run's shape matches the documented API per the research, or discrepancies are reported
- [ ] `vp run ready` passes

## Comments

**2026-08-26 (static-data grilling):** The ADR 0002 slug table now lives in `data/vendor-mapping.json` rather than a script constant, following the decided criterion "transcribed upstream facts live in data/". This supersedes the earlier selection wording "base slug or base + '/' + quantization; median of the p50s if several remain": matching is now exact against standard-variant endpoints, and an ambiguous match is a hard error instead of a median. Glossary gained "Vendor", "Vendor mapping", and "Consumer provider slug" (`docs/context.md`). Related extractions (cost adjustment factors, provenance URLs) are ticket 15, deliberately out of this ticket's scope. Snapshot shape, null handling, write policy, 429 details, key loading, and schema strictness from the earlier grilling remain open.
