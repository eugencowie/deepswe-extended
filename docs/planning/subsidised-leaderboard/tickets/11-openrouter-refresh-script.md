# 11: OpenRouter refresh script

Type: task
Status: ready-for-agent
Blocked by: 07

## What to build

Running the OpenRouter refresh script updates the checked-in throughput snapshot: for every mapped model it calls the documented model-endpoints API with a bearer key, selects the vendor's consumer endpoint per [ADR 0002](../../../architecture/0002-throughput-consumer-endpoint.md) (default-tier endpoints whose provider slug is the vendor's base slug or base + "/" + quantization; median of the p50s if several remain), and writes all models in one run under a single capture timestamp — per the reproducible fetch in the [research findings](../research/openrouter-throughput.md) and the [spec](../spec.md).

Guards: a mapped model id missing from OpenRouter is a hard error (the mapping is wrong — ids are revision-pinned); a model whose vendor runs no consumer endpoint is a warning and is omitted from the snapshot (blank in the UI — this happened to the unpinned DeepSeek V4 Pro listing between 2026-08-20 and 08-25).

Key handling: `OPENROUTER_API_KEY` from a gitignored local env file, never in CI; a missing key or all-null throughput (the unauthenticated symptom) is a hard error. Handle 429 with `Retry-After`. This first keyed run also verifies the documented API path, which the seed and 2026-08-25 snapshots (frontend feed) never exercised — flag any discrepancy against the research findings.

## Acceptance criteria

- [ ] Script writes the snapshot in the checked-in shape: per-model median plus raw endpoint values, one `capturedAt`
- [ ] Missing key and all-null throughput each fail with a clear message
- [ ] Flex/priority service-tier endpoints excluded from the median
- [ ] 429 responses respected via `Retry-After`
- [ ] First keyed run's shape matches the documented API per the research, or discrepancies are reported
- [ ] `vp run ready` passes
