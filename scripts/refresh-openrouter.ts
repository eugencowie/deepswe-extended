// Refreshes data/openrouter-throughput.json from OpenRouter's documented
// model-endpoints API. Run via `vp run refresh:openrouter` with
// OPENROUTER_API_KEY in a gitignored .env at the repo root or in the
// environment; changes land only through human-reviewed commits. Fails
// without writing anything when a guard rail trips.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import type { ModelMappingEntry, ThroughputSnapshot } from "../src/data/types.ts";
import {
  type OpenrouterEndpoint,
  buildSnapshot,
  endpointsResponseSchema,
  endpointsUrl,
  retryAfterMs,
  vendorMappingSchema,
} from "./openrouter-snapshot.ts";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is required: set it in a gitignored .env at the repo root " +
      "or in the environment.",
  );
}

const maxAttempts = 3;
async function fetchEndpoints(modelId: string): Promise<OpenrouterEndpoint[]> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(endpointsUrl(modelId), {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (response.status === 429 && attempt < maxAttempts) {
      const waitMs = retryAfterMs(response.headers.get("retry-after"));
      console.warn(
        `warning: 429 for ${modelId}; waiting ${waitMs / 1000}s (attempt ${attempt}/${maxAttempts}).`,
      );
      await sleep(waitMs);
      continue;
    }
    if (response.status === 404) {
      throw new Error(
        `OpenRouter has no model "${modelId}" (HTTP 404). The mapping is wrong — ids are ` +
          `revision-pinned; fix data/model-mapping.json.`,
      );
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${endpointsUrl(modelId)}`);
    }
    return endpointsResponseSchema.parse(await response.json()).data.endpoints;
  }
}

const mapping = JSON.parse(
  await readFile(new URL("../data/model-mapping.json", import.meta.url), "utf8"),
) as ModelMappingEntry[];
const vendorMapping = vendorMappingSchema.parse(
  JSON.parse(await readFile(new URL("../data/vendor-mapping.json", import.meta.url), "utf8")),
);

// One capture window: all models sequentially under a single timestamp, so
// cross-model comparisons are same-moment (spec: never compare values fetched
// days apart).
const capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const endpointsByModel = new Map<string, OpenrouterEndpoint[]>();
for (const entry of mapping) {
  if (entry.openrouterId === null || endpointsByModel.has(entry.openrouterId)) continue;
  endpointsByModel.set(entry.openrouterId, await fetchEndpoints(entry.openrouterId));
}

// A missing snapshot is a legitimate first run; a corrupt one is a repo
// problem that would silently disable the disappearance audit (ADR 0002), so
// it hard-errors like any other mismatch.
const snapshotPath = new URL("../data/openrouter-throughput.json", import.meta.url);
const existing = await readFile(snapshotPath, "utf8").then(
  (text): ThroughputSnapshot | null => {
    try {
      return JSON.parse(text) as ThroughputSnapshot;
    } catch (error) {
      throw new Error(
        `data/openrouter-throughput.json is not valid JSON — fix or delete it. (${String(error)})`,
      );
    }
  },
  (error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  },
);

const { snapshot, warnings } = buildSnapshot(
  mapping,
  vendorMapping,
  endpointsByModel,
  existing,
  capturedAt,
);
for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  `Wrote data/openrouter-throughput.json: ${Object.keys(snapshot.models).length} models, ` +
    `captured at ${capturedAt}.`,
);

// The PR body's summary (ADR 0004): the snapshot has no load-time invariants,
// so the reviewer's count acknowledgement — and any omission or disappearance
// warning, whose previous values live only in the review — must reach the PR.
const summary = [
  "### Data summary",
  "",
  "| Measure | Before | After |",
  "| --- | ---: | ---: |",
  `| Models | ${existing ? Object.keys(existing.models).length : "—"} | ${Object.keys(snapshot.models).length} |`,
  "",
  `Captured at ${capturedAt}.`,
];
if (warnings.length > 0) {
  summary.push("", "Warnings:", ...warnings.map((warning) => `- ${warning}`));
}
if (process.env.GITHUB_OUTPUT) {
  // Unique delimiter per GitHub's guidance: the summary splices in
  // upstream-derived text, which must not be able to terminate the heredoc.
  const delimiter = `SUMMARY_${randomUUID()}`;
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `summary<<${delimiter}\n${summary.join("\n")}\n${delimiter}\n`,
  );
}
