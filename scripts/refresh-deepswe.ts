// Refreshes data/deepswe-v1.1.json from the live DeepSWE source. Run via
// `vp run refresh:deepswe`, locally or from the scheduled workflow; changes
// land only through human-reviewed commits. Fails without writing anything
// when a guard rail trips.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { DeepsweSnapshot, ModelMappingEntry } from "../src/data/types.ts";
import {
  artifactUrl,
  costAdjustmentsSchema,
  hasMeaningfulChange,
  leaderboardArtifactSchema,
  normalize,
  origin,
  versionManifestSchema,
} from "./deepswe-snapshot.ts";
import {
  generateMappingEntries,
  openrouterModelsSchema,
  openrouterModelsUrl,
} from "./mapping-generation.ts";

async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const manifestBytes = await fetchBytes(`${origin}/artifacts/versions.json`);
const manifest = versionManifestSchema.parse(JSON.parse(manifestBytes.toString("utf8")));

const artifactBytes = await fetchBytes(artifactUrl(manifest));
const artifact = leaderboardArtifactSchema.parse(JSON.parse(artifactBytes.toString("utf8")));
const rawSha256 = createHash("sha256").update(artifactBytes).digest("hex");

const mappingPath = new URL("../data/model-mapping.json", import.meta.url);
const mapping = JSON.parse(await readFile(mappingPath, "utf8")) as ModelMappingEntry[];

const costAdjustmentsPath = new URL("../data/cost-adjustments.json", import.meta.url);
const { factors } = costAdjustmentsSchema.parse(
  JSON.parse(await readFile(costAdjustmentsPath, "utf8")),
);

// New models from known vendors get generated mapping entries (ADR 0003);
// anything still unmapped afterwards fails normalize's guard as before.
const mappedModels = new Set(mapping.map((entry) => entry.leaderboardModel));
const unmapped = [...new Set(artifact.rows.map((row) => row.model))].filter(
  (model) => !mappedModels.has(model),
);
const generated: ModelMappingEntry[] = [];
if (unmapped.length > 0) {
  // An unreachable models API fails the run like any other fetch error; the
  // failure email is the alert and a manual re-run the retry.
  const bytes = await fetchBytes(openrouterModelsUrl);
  const listings = openrouterModelsSchema.parse(JSON.parse(bytes.toString("utf8"))).data;
  const result = generateMappingEntries(unmapped, mapping, listings);
  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }
  generated.push(...result.generated);
}

const { snapshot, warnings } = normalize(
  manifest,
  artifact,
  [...mapping, ...generated],
  factors,
  rawSha256,
);
for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

// Written only after normalize succeeds, so a tripped guard rail still leaves
// everything untouched.
if (generated.length > 0) {
  await writeFile(mappingPath, `${JSON.stringify([...mapping, ...generated], null, 2)}\n`);
  console.log(
    `Generated mapping entries in data/model-mapping.json: ` +
      `${generated.map((entry) => entry.leaderboardModel).join(", ")}.`,
  );
}

const snapshotPath = new URL("../data/deepswe-v1.1.json", import.meta.url);
const existing = await readFile(snapshotPath, "utf8").then(
  (text) => JSON.parse(text) as DeepsweSnapshot,
  () => null,
);
if (existing && !hasMeaningfulChange(existing, snapshot)) {
  console.log(
    "No content change; leaving data/deepswe-v1.1.json untouched " +
      `(upstream raw_sha256 ${rawSha256}, generated at ${snapshot.source_generated_at}).`,
  );
} else {
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Wrote data/deepswe-v1.1.json: ${snapshot.entries.length} entries, ` +
      `source generated at ${snapshot.source_generated_at}.`,
  );
}
