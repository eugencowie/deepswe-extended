# OpenRouter throughput research

Retrieved 2026-08-20. The numeric snapshot was fetched between 14:50:24 and 14:50:27 UTC.

## Recommendation

Use OpenRouter's documented `GET /api/v1/models/{author}/{slug}/endpoints` endpoint with a bearer API key. It returns a 30-minute throughput percentile object for each provider endpoint, including `p50`, `p75`, `p90`, and `p99`; throughput is not a model-level field. The endpoint and its response schema are part of the official API reference, which makes this the integration to put in the refresh script. [OpenRouter endpoint API reference](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model)

For the leaderboard's single number per model, take the unweighted median of the non-null, default-tier endpoint `p50` values. Keep the endpoint values and capture time in the snapshot for auditability. Do not copy the large number at the top of an OpenRouter model page. The page labels it "P50, best across providers," so it is the maximum endpoint p50, not an aggregate. [Example model page](https://openrouter.ai/openai/gpt-5.4)

The median is a compromise, not an OpenRouter-defined model statistic. It represents a typical available endpoint and is resistant to one unusually fast endpoint. It also avoids weighting by request volume, which would bake OpenRouter's current price and uptime routing mix into the comparison. This matters in the live data: GPT-5.4's page-best 77 tok/s came from one request, Claude Sonnet 5's 85 tok/s from one request, and Kimi K2.7 Code's 332.5 tok/s from four requests. The corresponding cross-endpoint medians were 38, 61.5, and 38 tok/s. [GPT-5.4 endpoint data](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard), [Claude Sonnet 5 endpoint data](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-sonnet-5-20260630&variant=standard), [Kimi K2.7 Code endpoint data](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=moonshotai/kimi-k2.7-code-20260612&variant=standard)

## API access and stability

### Documented API

The public API route is:

```text
GET https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints
Authorization: Bearer <OPENROUTER_API_KEY>
```

The official reference marks bearer authentication as required. OpenRouter's authentication guide says ordinary API keys use bearer tokens. [Endpoint API reference](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model), [authentication guide](https://openrouter.ai/docs/api_reference/authentication)

An unauthenticated request returned HTTP 200 during this research, but every `throughput_last_30m` and `latency_last_30m` value was `null`. That permissive status code should not be mistaken for unauthenticated metric access. This can be reproduced against [the GPT-5.4 endpoint response](https://openrouter.ai/api/v1/models/openai/gpt-5.4/endpoints). A refresh job needs `OPENROUTER_API_KEY` and should fail clearly if all throughput objects are null.

The documented response is per endpoint. Each item includes the provider name and tag, model ID, quantization, status, pricing, and:

```json
{
  "throughput_last_30m": {
    "p50": 45.2,
    "p75": 38.5,
    "p90": 28.3,
    "p99": 15.1
  }
}
```

OpenRouter describes these as 30-minute output-generation speed percentiles measured in tokens per second. [Endpoint response schema](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model#response)

OpenRouter publishes no route-specific quota for this read endpoint. Its general limits page documents free-model request caps and Cloudflare DDoS protection, says paid variants have no platform-level request cap, and explains that 429 responses carry limit headers when OpenRouter imposes a platform limit. Successful responses do not carry those headers. A daily or manual refresh is far below the described limits, but the script should still handle 429 and `Retry-After`. [OpenRouter limits](https://openrouter.ai/docs/api_reference/limits)

The documented, versioned `/api/v1` route is the stable choice. The endpoint's schema explicitly includes `throughput_last_30m`; a schema change would be an API compatibility change rather than an incidental frontend refactor. This is an assessment based on the published reference, not a guarantee from OpenRouter. [Endpoint API reference](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model)

### Frontend feed

The model page currently fetches the following first-party route without authentication:

```text
GET https://openrouter.ai/api/frontend/v1/stats/endpoint
    ?permaslug=<canonical model slug>
    &variant=standard
```

Its endpoint objects contain `stats.p50_throughput`, the other percentiles, `request_count`, and `window_minutes: 30`. They also contain `statsByTier.default`, `statsByTier.flex`, and `statsByTier.priority` where those service tiers exist. [Live GPT-5.4 response](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard)

This feed is useful for diagnosis and for the snapshot below because no API key was available in the research environment. It is not in the public API reference, has a frontend-specific path, and returns internal page data well beyond the public endpoint schema. Treat it as an unsupported fallback that can disappear or change without notice. The response was cached for five minutes during this research, and no route-specific rate limit is published. Polling it faster than that has no value. The canonical `permaslug` needed by this route can currently be obtained from `data.canonical_slug` in the documented single-model lookup. [Model lookup documentation](https://openrouter.ai/docs/guides/overview/models#single-model-lookup), [live frontend response](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard)

## Shape and aggregation

OpenRouter measures throughput for a model-provider endpoint, not once for the model. The model page shows one row per endpoint and describes the headline as the best p50 across providers. [OpenRouter provider performance documentation](https://openrouter.ai/docs/guides/community/for-providers#11-performance-metrics), [GPT-5.4 model page](https://openrouter.ai/openai/gpt-5.4)

There is no published "default-routing throughput" number to fetch. OpenRouter says default requests are price-weighted across available providers while taking uptime into account. Explicit `sort: "throughput"` disables that load balancing and orders endpoints by throughput. The model-list API can sort models by a p50 routing heuristic, but it does not add a throughput value to the returned model object. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection#provider-sorting), [model-list sorting](https://openrouter.ai/docs/guides/overview/models#sort)

For this project, calculate the median as follows:

1. Fetch the base, non-batch model ID from the hand-curated model mapping.
2. Keep active endpoints and read each endpoint's `throughput_last_30m.p50`.
3. Exclude null metrics and separate `flex` or `priority` service-tier endpoints from the default tier. The frontend equivalent is `statsByTier.default.p50_throughput`, falling back to `stats.p50_throughput` only when `statsByTier.default` is absent.
4. Sort the remaining values and take the middle value, or the mean of the two middle values.
5. Save the median, raw endpoint values, endpoint tags, and `capturedAt` timestamp.

Do not collapse endpoints by display-name provider first. OpenRouter routes regional and quantized endpoint tags separately, and their measured rates can differ materially. For example, the current DeepSeek V4 Pro response has distinct DeepSeek, Baidu FP8, StreamLake FP8, DeepInfra FP8, and other endpoint rows. [DeepSeek V4 Pro endpoint data](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=deepseek/deepseek-v4-pro-20260423&variant=standard)

## What the number measures

OpenRouter defines throughput as `output tokens / generation time`. Generation time includes fetch latency, time to first token, and streaming time. Provider-side queuing therefore lowers the rate. OpenRouter also tells reasoning-model providers to send keep-alives while they think so that a long silent interval does not hit the fetch timeout. [Performance metric definition](https://openrouter.ai/docs/guides/community/for-providers#11-performance-metrics)

This is not decoder-only tokens per second. It is closer to end-to-end output rate for one model call. The leaderboard formula `output tokens / throughput` therefore does not wholly ignore latency: OpenRouter has already folded fetch and first-token latency into the denominator.

The public endpoint and model-page feed use a 30-minute window. OpenRouter's routing threshold documentation separately describes rolling five-minute percentiles used by routing heuristics. These are different products of the metrics system. Do not substitute the five-minute router heuristic for `throughput_last_30m`. [Endpoint schema](https://openrouter.ai/docs/api/api-reference/endpoints/list-all-endpoints-for-a-model#response), [routing percentile window](https://openrouter.ai/docs/guides/routing/provider-selection#how-percentiles-work)

Use p50 only. OpenRouter describes routing throughput percentiles as service-level cutoffs, while the frontend feed's raw percentile values use conventional ascending quantiles. The two agree at p50 but should not be assumed interchangeable at p75, p90, or p99 without a keyed API comparison. [Routing percentile semantics](https://openrouter.ai/docs/guides/routing/provider-selection#how-percentiles-work), [live frontend values](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard)

OpenRouter says reasoning tokens are output tokens, including when they are hidden from the response, and its usage schema reports them inside completion-token details. It is therefore reasonable to infer that throughput's "output tokens" includes reasoning tokens when the upstream provider reports them. OpenRouter does not document the throughput pipeline at that level, so this remains an inference. [Reasoning-token guide](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens), [usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)

Several effects make `DeepSWE output tokens / OpenRouter p50 throughput` a rough time estimate:

- DeepSWE tasks make many agent calls. OpenRouter measures individual calls, so the calculation omits tool execution, repository operations, network gaps between calls, and harness overhead.
- The rate depends on request length, output length, reasoning effort, provider load, region, and service tier. The live 30-minute traffic mix need not resemble DeepSWE's long coding-agent calls.
- OpenRouter includes first-token and queue time in its generation-time denominator. Dividing a task's total output tokens by that per-call rate only approximates repeated-call latency.
- Token counts come from model or provider tokenizers. A numerator captured by a different harness or tokenizer can differ, especially around hidden reasoning. OpenRouter's usage accounting says it uses each model's native tokenizer. [Usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)

The estimator is still useful for relative comparison if every model uses the same rule and the UI labels it as an estimate.

## Current model snapshot

The DeepSWE v1.1 artifact contains 25 unique models. All 25 had an exact OpenRouter listing on 2026-08-20; none was missing. [DeepSWE v1.1 artifact](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json), [OpenRouter model catalog](https://openrouter.ai/api/v1/models)

The "median" column is the recommended median of default-tier endpoint p50s. "Page best" is the maximum `stats.p50_throughput`, matching the model-page headline. "Range" is the minimum and maximum default-tier endpoint p50. `n` is endpoints with a non-null default-tier metric divided by standard endpoints returned. All values are tokens per second and are a point-in-time snapshot, not constants.

| DeepSWE model | OpenRouter source | Median | Page best | Range | n |
|---|---|---:|---:|---:|---:|
| claude-opus-5 | [anthropic/claude-opus-5](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-opus-5-20260723&variant=standard) | 58.75 | 65 | 52 to 65 | 8/9 |
| gpt-5-6-sol | [openai/gpt-5.6-sol](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.6-sol-20260709&variant=standard) | 40 | 47 | 32 to 47 | 4/5 |
| claude-fable-5 | [anthropic/claude-fable-5](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-5-fable-20260609&variant=standard) | 43 | 51 | 28.5 to 51 | 4/6 |
| glm-5-3 | [z-ai/glm-5.3](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=z-ai/glm-5.3-20260816&variant=standard) | 31 | 31 | 31 to 31 | 1/1 |
| kimi-k3 | [moonshotai/kimi-k3](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=moonshotai/kimi-k3-20260715&variant=standard) | 28.25 | 78 | 11.5 to 78 | 14/14 |
| gpt-5-6-terra | [openai/gpt-5.6-terra](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.6-terra-20260709&variant=standard) | 42 | 52 | 21 to 52 | 5/5 |
| gpt-5-6-luna | [openai/gpt-5.6-luna](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.6-luna-20260709&variant=standard) | 42 | 90 | 28 to 90 | 5/5 |
| gpt-5-5 | [openai/gpt-5.5](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.5-20260423&variant=standard) | 46 | 47 | 38.5 to 47 | 3/5 |
| gemini-3-7-flash | [google/gemini-3.7-flash](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=google/gemini-3.7-flash-20260813&variant=standard) | 120 | 158 | 81 to 159 | 2/2 |
| deepseek-v4-pro | [deepseek/deepseek-v4-pro](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=deepseek/deepseek-v4-pro-20260423&variant=standard) | 48 | 63 | 27 to 63 | 17/18 |
| claude-opus-4-8 | [anthropic/claude-opus-4.8](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-4.8-opus-20260528&variant=standard) | 56 | 91 | 34 to 91 | 8/10 |
| qwen3-8-max | [qwen/qwen3.8-max](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=qwen/qwen3.8-max-20260803&variant=standard) | 42 | 42 | 42 to 42 | 1/1 |
| claude-sonnet-5 | [anthropic/claude-sonnet-5](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-sonnet-5-20260630&variant=standard) | 61.5 | 85 | 44 to 85 | 8/9 |
| deepseek-v4-flash | [deepseek/deepseek-v4-flash](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=deepseek/deepseek-v4-flash-20260423&variant=standard) | 38 | 80 | 4 to 80 | 18/18 |
| gemini-3-6-flash | [google/gemini-3.6-flash](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=google/gemini-3.6-flash-20260721&variant=standard) | 116 | 163 | 46 to 163 | 3/3 |
| glm-5-2 | [z-ai/glm-5.2](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=z-ai/glm-5.2-20260616&variant=standard) | 46 | 94 | 25 to 94 | 31/31 |
| gemini-3-5-flash | [google/gemini-3.5-flash](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=google/gemini-3.5-flash-20260519&variant=standard) | 156.5 | 181 | 132 to 181 | 2/3 |
| gpt-5-4 | [openai/gpt-5.4](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard) | 38 | 77 | 13 to 77 | 4/5 |
| kimi-k2-7-code | [moonshotai/kimi-k2.7-code](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=moonshotai/kimi-k2.7-code-20260612&variant=standard) | 38 | 332.5 | 21 to 332.5 | 15/15 |
| claude-sonnet-4-6 | [anthropic/claude-sonnet-4.6](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=anthropic/claude-4.6-sonnet-20260217&variant=standard) | 37.5 | 56 | 13 to 56 | 8/9 |
| gemini-3-1-pro-preview | [google/gemini-3.1-pro-preview](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=google/gemini-3.1-pro-preview-20260219&variant=standard) | 98.5 | 100 | 97 to 100 | 2/2 |
| grok-4-5 | [x-ai/grok-4.5](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=x-ai/grok-4.5-20260708&variant=standard) | 46 | 47 | 45 to 47 | 2/2 |
| grok-4-6 | [x-ai/grok-4.6](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=x-ai/grok-4.6-20260810&variant=standard) | 39 | 48 | 30 to 48 | 2/2 |
| muse-spark-1-1 | [meta/muse-spark-1.1](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=meta/muse-spark-1.1-20260709&variant=standard) | 230 | 230 | 230 to 230 | 1/1 |
| muse-spark-1-2 | [meta/muse-spark-1.2](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=meta/muse-spark-1.2-20260805&variant=standard) | 65 | 65 | 65 to 65 | 1/1 |

Three Codex-family reference models were also captured even though they are not in the v1.1 artifact:

| OpenRouter source | Median | Page best | Range | n |
|---|---:|---:|---:|---:|
| [openai/gpt-5.3-codex](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.3-codex-20260224&variant=standard) | 56 | 66 | 46 to 66 | 2/2 |
| [openai/gpt-5.2-codex](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.2-codex-20260114&variant=standard) | 30 | 30 | 30 to 30 | 1/1 |
| [openai/gpt-5.1-codex-max](https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.1-codex-max-20251204&variant=standard) | 25 | 25 | 25 to 25 | 1/1 |

## Reproducible fetch

This TypeScript sketch uses the documented endpoint. The exact response type should be narrowed to the fields the refresh job stores.

```ts
type Throughput = {
  p50: number;
  p75: number;
  p90: number;
  p99: number;
};

type Endpoint = {
  tag: string;
  provider_name: string;
  status: number;
  throughput_last_30m: Throughput | null;
};

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY is required");

async function fetchThroughput(modelId: string) {
  const response = await fetch(
    `https://openrouter.ai/api/v1/models/${modelId}/endpoints`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!response.ok) {
    throw new Error(`OpenRouter ${modelId}: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    data: { endpoints: Endpoint[] };
  };

  const endpoints = payload.data.endpoints
    .filter((endpoint) => endpoint.status === 0)
    .filter((endpoint) => !/\/(?:flex|priority)$/.test(endpoint.tag))
    .flatMap((endpoint) => {
      const p50 = endpoint.throughput_last_30m?.p50;
      return p50 == null
        ? []
        : [{ tag: endpoint.tag, provider: endpoint.provider_name, p50 }];
    })
    .sort((a, b) => a.p50 - b.p50);

  if (endpoints.length === 0) {
    throw new Error(`OpenRouter ${modelId}: no 30-minute p50 data`);
  }

  const middle = Math.floor(endpoints.length / 2);
  const median = endpoints.length % 2
    ? endpoints[middle].p50
    : (endpoints[middle - 1].p50 + endpoints[middle].p50) / 2;

  return {
    modelId,
    capturedAt: new Date().toISOString(),
    throughputTokensPerSecond: median,
    endpoints,
  };
}
```

The frontend-only reproduction used for the numeric capture was:

```sh
curl -sS \
  'https://openrouter.ai/api/frontend/v1/stats/endpoint?permaslug=openai/gpt-5.4-20260305&variant=standard' \
  | jq '.data[] | {
      tag: .provider_slug,
      p50: (.statsByTier.default.p50_throughput // .stats.p50_throughput),
      requests: (.statsByTier.default.request_count // .stats.request_count),
      windowMinutes: (.statsByTier.default.window_minutes // .stats.window_minutes)
    }'
```

Because the source is a rolling 30-minute statistic, refresh all models in one run and record one snapshot timestamp. Do not compare values fetched days apart.
