# 11: OpenRouter refresh script

Type: task
Status: ready-for-agent
Blocked by: 07

## What to build

Running the OpenRouter refresh script updates the checked-in throughput snapshot: for every mapped model it calls the documented model-endpoints API with a bearer key, takes the median of non-null default-tier endpoint p50 values, and writes all models in one run under a single capture timestamp — per the reproducible fetch in the [research findings](../research/openrouter-throughput.md) and the [spec](../spec.md).

Key handling: `OPENROUTER_API_KEY` from a gitignored local env file, never in CI; a missing key or all-null throughput (the unauthenticated symptom) is a hard error. Handle 429 with `Retry-After`. This first keyed run also verifies the documented API path, which the seed snapshot (frontend feed) never exercised — flag any discrepancy against the research findings.

## Acceptance criteria

- [ ] Script writes the snapshot in the checked-in shape: per-model median plus raw endpoint values, one `capturedAt`
- [ ] Missing key and all-null throughput each fail with a clear message
- [ ] Flex/priority service-tier endpoints excluded from the median
- [ ] 429 responses respected via `Retry-After`
- [ ] First keyed run's shape matches the documented API per the research, or discrepancies are reported
- [ ] `vp run ready` passes
