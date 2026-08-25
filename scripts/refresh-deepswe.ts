// Refreshes data/deepswe-v1.1.json from the live DeepSWE source. Manual
// cadence: run via `vp run refresh:deepswe`, review the diff, commit. Fails
// without writing anything when a guard rail trips.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { ModelMappingEntry } from "../src/data/types.ts";
import {
  artifactUrl,
  leaderboardArtifactSchema,
  normalize,
  origin,
  versionManifestSchema,
} from "./deepswe-snapshot.ts";

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

const { snapshot, warnings } = normalize(manifest, artifact, mapping, rawSha256);
for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

const snapshotPath = new URL("../data/deepswe-v1.1.json", import.meta.url);
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  `Wrote data/deepswe-v1.1.json: ${snapshot.entries.length} entries, ` +
    `source generated at ${snapshot.source_generated_at}.`,
);
