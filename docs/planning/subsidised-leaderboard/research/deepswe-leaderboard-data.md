# DeepSWE v1.1 leaderboard data

Researched on 2026-08-20 against first-party site artifacts, deployed site code, the DeepSWE repository, and Pier source.

## Answer

Yes. The v1.1 leaderboard has a public, CORS-enabled JSON source at [`/artifacts/v1.1/leaderboard-live.json`](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json). The capture used here contains 62 entries across 25 model names and was generated at `2026-08-20T07:48:24.252395+00:00`. Its top-level metadata names 113 tasks and says the rows group every imported DeepSWE rollout by harness, model, and reasoning effort. [The artifact itself supplies all of these values.](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json)

Two files preserve the capture:

- [Raw source JSON](./deepswe-v1.1-leaderboard.raw.json), byte-for-byte response body, SHA-256 `41940b22593f98d41d098ad6cad350932b26a65fa0384bb6d9ec5e34c2c7374c`
- [Normalized entries](./deepswe-v1.1-leaderboard.normalized.json), 62 entries with `model`, `effort`, `pass_at_1`, rendered `average_cost_usd`, `output_tokens`, and `steps`; SHA-256 `c552edca4888f96eb7eb4ae95a6117d8c51b00281b04b005b7ba51423ed0acad`

The raw field mapping is direct:

| Requested field | Artifact field | Unit |
|---|---|---|
| Model | `model` | Site model identifier |
| Effort | `reasoning_effort` | String or `null` for the default |
| Pass@1 | `pass_at_1` | Fraction from 0 to 1 |
| Average cost | `mean_cost_usd` | USD per scored task attempt with a recorded cost, before the site's display-time price adjustments |
| Output tokens | `mean_output_tokens` | Tokens per scored task attempt with recorded token metrics |
| Steps | `mean_agent_steps` | Agent-authored turns per scored task attempt with recorded step metrics |

The [leaderboard artifact](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json) defines these fields and its [deployed chart code](https://deepswe.datacurve.ai/assets/live-leaderboard-CGGKeeMm.js) labels the efficiency axes "Avg cost per task", "Avg output tokens per task", and "Avg agent steps per task".

## The cost adjustment trap

The endpoint's cost values are not always the numbers rendered by the site. The deployed artifact loader recursively multiplies fields ending in `_cost_usd` for these v1.1 models:

| Model | Display factor | Affected entries |
|---|---:|---:|
| `gpt-5-6-luna` | 0.2 | 5 |
| `gpt-5-6-terra` | 0.8 | 5 |
| `gemini-3-6-flash` | 0.5 | 1 |

The same code has a 0.25 factor for `deepseek-v4-pro`, but limits it to the older `v1` dataset. It does not apply that factor to v1.1. [The active bundle contains both the factors and version guard.](https://deepswe.datacurve.ai/assets/index-CuvguQ7a.js)

For example, Luna medium is `$0.21630978982300886` in the raw endpoint and `$0.04326195796460178` after the site's 0.2 factor. The normalized capture retains `raw_average_cost_usd` and `cost_adjustment_factor` beside the rendered `average_cost_usd`, so this conversion stays auditable. [The raw value is in the versioned artifact](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json), while [the homepage applies the adjustment before rendering](https://deepswe.datacurve.ai/).

These are retroactive reporting changes, not measurements made during a new benchmark run. The official changelog says GPT-5.6 Terra and Luna were updated after OpenAI's July 30 rate cuts and Gemini 3.6 Flash after Google's August 13 price cut. It also records a DeepSeek v4 Pro correction. [DeepSWE changelog](https://deepswe.datacurve.ai/changelog)

There is no public price manifest or rate-card identifier in the leaderboard or trial JSON. The raw trials carry a `cost_usd` number and `metrics_source`, but no complete set of input, cached-input, output, or date-pinned prices. [The public trial index exposes the available fields.](https://deepswe.datacurve.ai/artifacts/v1.1/trials.json) Pier's mini-swe-agent adapter starts from the trajectory's `instance_cost`, falling back to summed per-message usage cost, and then promotes that total to the trial context. [Pier cost extraction](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/agents/installed/mini_swe_agent.py#L308-L326) [Pier metric promotion](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/utils/trajectory_metrics.py#L39-L46)

So "average cost" has a precise aggregation meaning, but not one immutable API rate sheet. It is the mean recorded run cost, followed by the site's explicit repricing factors. A refresh script cannot derive future price corrections from the leaderboard JSON alone.

## Metric semantics

### Pass@1

DeepSWE v1.1 contains 113 original, long-horizon software engineering tasks from active open-source repositories, with isolated task environments and program-based verifiers. [Official benchmark README](https://github.com/datacurve-ai/deep-swe/blob/435ee89ec2f2e2289f33b0da4f992f0b7b7266b9/README.md#L3-L20)

`pass_at_1` is the pooled pass rate over scored rollout attempts, not the percentage of 113 tasks solved at least once. Every captured configuration has `n_runs: 4`; most therefore have close to 452 attempts. The exact formula is `n_passed / n_attempted`. For example, Claude Opus 5 at max effort has `327 / 444 = 0.736486...`. Context-window failures and agent timeouts count as failed attempts. Provider, verifier, and network errors are excluded. [The artifact's `unit` text and per-row counters define this directly.](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json)

`pass_at_4` is a different value in the source. It is the share of attempted tasks with at least one passing rollout. The requested dataset intentionally keeps `pass_at_1`. [The artifact defines both counters and rates.](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json)

### Average cost, output tokens, and steps

Each efficiency number averages individual scored attempts, and each attempt runs one task. Both passing and failing scored attempts contribute. Excluded infrastructure errors do not enter these aggregates. [The leaderboard's `unit` text states that efficiency aggregates cover scored attempts.](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json)

There is one small null-handling detail. Comparing the public trial rows with the aggregates shows that a metric missing from an otherwise scored attempt is omitted from that metric's divisor. This affects a few configurations. It does not turn the missing value into zero. This is an inference checked against every v1.1 aggregate in the [trial index](https://deepswe.datacurve.ai/artifacts/v1.1/trials.json) and [leaderboard artifact](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json).

"Output tokens" means provider-reported completion or output usage across every model call, not visible prose alone. Pier sums `completion_tokens`, or `output_tokens` when that is the provider field. It separately reads reasoning tokens as a subset of completion-token details and copies the full completion total to `n_output_tokens`. Reasoning tokens are therefore included when the provider reports them in its completion total. [Pier's mini-swe conversion](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/agents/installed/mini_swe_agent.py#L308-L368) [Final total promotion](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/agents/installed/mini_swe_agent.py#L469-L487) A [public example trajectory](https://d3ujjcmjq6o8v6.cloudfront.net/v1.1/trial-artifacts/abs-module-cache-flags__2F3eHa3/agent/trajectory.json) makes this concrete: its 51,452 completion tokens include 32,338 reasoning tokens, and the corresponding [trial index row](https://deepswe.datacurve.ai/artifacts/v1.1/trials.json) reports 51,452 output tokens.

A "step" is an agent-authored trajectory turn. Pier counts trajectory records whose `source` is `agent`. In the mini-swe adapter, each assistant message or Responses API response creates one such step with `llm_call_count=1`, while tool outputs attach as observations to the preceding agent step. It is therefore one agent LLM turn, not one shell command or tool call. [Step counter](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/trial/trial.py#L118-L134) [Mini-swe step construction](https://github.com/datacurve-ai/pier/blob/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e/src/pier/agents/installed/mini_swe_agent.py#L381-L467) DeepSWE states that all leaderboard scores use Pier running mini-swe-agent on Modal. [Official benchmark README](https://github.com/datacurve-ai/deep-swe/blob/435ee89ec2f2e2289f33b0da4f992f0b7b7266b9/README.md#L50-L58)

## Version targeting and change detection

The site publishes a machine-readable version manifest at [`/artifacts/versions.json`](https://deepswe.datacurve.ai/artifacts/versions.json). It currently reports `latest: "v1.1"` and lists v1.1 as stable with node-id scoring. The older release's site identifier is `v1`, not `v1.0`; `/artifacts/v1.0/leaderboard-live.json` returns 404, while [`/artifacts/v1/leaderboard-live.json`](https://deepswe.datacurve.ai/artifacts/v1/leaderboard-live.json) is the older dataset. [The manifest is the authoritative list of site IDs and data paths.](https://deepswe.datacurve.ai/artifacts/versions.json)

A script can target v1.1 without following "latest":

```text
https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json
```

To detect a new benchmark version, compare the manifest's `latest` with the pinned `v1.1` and inspect the new entry before switching. To detect changes within v1.1, compare `generated_at`, `latest_job`, the response `ETag`, or a content hash. The filename says `live` and the current v1.1 leaderboard has continued to gain configurations after the June release, as recorded by the [official changelog](https://deepswe.datacurve.ai/changelog). A version pin alone does not make a reproducible snapshot.

## Recommended TypeScript refresh strategy

Fetch the manifest and exact versioned artifact. Save the raw response bytes before normalization, validate the schema, reject duplicate configuration IDs, and keep v1.1 pinned until a human reviews a new manifest entry. Apply the current display-price factors in an explicit checked-in table. Do not scrape the rendered HTML or evaluate the site's serialized hydration script.

```ts
import { z } from "zod";

const origin = "https://deepswe.datacurve.ai";
const benchmarkVersion = "v1.1";

const versionManifestSchema = z.object({
  latest: z.string(),
  versions: z.array(z.object({
    id: z.string(),
    data_path: z.string(),
    n_tasks: z.number().int().positive(),
    status: z.string(),
  })),
});

const leaderboardSchema = z.object({
  generated_at: z.string().datetime({ offset: true }),
  latest_job: z.object({
    name: z.string(),
    finished_at: z.string().nullable(),
  }).nullable(),
  n_tasks_in_set: z.number().int().positive(),
  rows: z.array(z.object({
    model: z.string().min(1),
    reasoning_effort: z.string().min(1).nullable(),
    config: z.string().min(1),
    pass_at_1: z.number().min(0).max(1),
    mean_cost_usd: z.number().finite().nonnegative(),
    mean_output_tokens: z.number().finite().nonnegative(),
    mean_agent_steps: z.number().finite().nonnegative(),
    n_attempted: z.number().int().positive(),
  })),
});

const displayCostFactor: Readonly<Record<string, number>> = {
  "gpt-5-6-luna": 0.2,
  "gpt-5-6-terra": 0.8,
  "gemini-3-6-flash": 0.5,
};

async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<{
  data: T;
  raw: string;
  etag: string | null;
}> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  const raw = await response.text();
  return {
    data: schema.parse(JSON.parse(raw)),
    raw,
    etag: response.headers.get("etag"),
  };
}

const versions = await getJson(
  `${origin}/artifacts/versions.json`,
  versionManifestSchema,
);
const selected = versions.data.versions.find(
  ({ id }) => id === benchmarkVersion,
);
if (!selected) throw new Error(`Unknown DeepSWE version: ${benchmarkVersion}`);
if (versions.data.latest !== benchmarkVersion) {
  console.warn(`New DeepSWE version available: ${versions.data.latest}`);
}

const source = await getJson(
  `${origin}/artifacts/${selected.data_path}/leaderboard-live.json`,
  leaderboardSchema,
);
if (source.data.n_tasks_in_set !== selected.n_tasks) {
  throw new Error("Version manifest and leaderboard task counts disagree");
}

const seen = new Set<string>();
const entries = source.data.rows.map((row) => {
  if (seen.has(row.config)) throw new Error(`Duplicate config: ${row.config}`);
  seen.add(row.config);
  const factor = displayCostFactor[row.model] ?? 1;
  return {
    model: row.model,
    effort: row.reasoning_effort,
    pass_at_1: row.pass_at_1,
    average_cost_usd: row.mean_cost_usd * factor,
    output_tokens: row.mean_output_tokens,
    steps: row.mean_agent_steps,
    n_scored_attempts: row.n_attempted,
    source_config: row.config,
    raw_average_cost_usd: row.mean_cost_usd,
    cost_adjustment_factor: factor,
  };
});
```

The endpoint is suitable for an automated refresh. Exact price parity still needs one manual check: inspect the [official changelog](https://deepswe.datacurve.ai/changelog) and the deployed [artifact transformation code](https://deepswe.datacurve.ai/assets/index-CuvguQ7a.js) whenever costs or the site bundle change. No first-party JSON currently exposes those factors separately.

## Sources

- [DeepSWE v1.1 leaderboard JSON](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json)
- [DeepSWE version manifest](https://deepswe.datacurve.ai/artifacts/versions.json)
- [DeepSWE v1.1 trial index](https://deepswe.datacurve.ai/artifacts/v1.1/trials.json)
- [DeepSWE v1.1 release descriptor](https://deepswe.datacurve.ai/artifacts/v1.1/release.json)
- [DeepSWE v1.1 announcement](https://deepswe.datacurve.ai/blog/deepswe-v1-1)
- [DeepSWE changelog](https://deepswe.datacurve.ai/changelog)
- [Deployed site artifact loader and version metadata](https://deepswe.datacurve.ai/assets/index-CuvguQ7a.js)
- [Deployed live leaderboard component](https://deepswe.datacurve.ai/assets/live-leaderboard-CGGKeeMm.js)
- [DeepSWE repository at the inspected commit](https://github.com/datacurve-ai/deep-swe/tree/435ee89ec2f2e2289f33b0da4f992f0b7b7266b9)
- [Pier repository at the inspected commit](https://github.com/datacurve-ai/pier/tree/949ec4f6004fa74f4a5b0d05c4f3c1a98e8a4a9e)
