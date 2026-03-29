import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import zlib from "node:zlib";

import streamChain from "stream-chain";
import streamJson from "stream-json";
import pickModule from "stream-json/filters/Pick.js";
import streamArrayModule from "stream-json/streamers/StreamArray.js";

const require = createRequire(import.meta.url);
const {
  OPENFDA_NDC_BULK_URL,
  createMedicationAggregator,
} = require("../lib/medications/normalize");
const { SNAPSHOT_PATH } = require("../lib/medications/index-store");
const { chain } = streamChain;
const { parser } = streamJson;
const { pick } = pickModule;
const { streamArray } = streamArrayModule;

async function downloadBulkZip(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/zip",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to download the openFDA NDC bulk file (${response.status}).`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pharmapath-medications-"));
  const targetPath = path.join(tempDir, "drug-ndc.json.zip");
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
  return targetPath;
}

async function parseDatasetLastUpdated(zipPath) {
  return new Promise((resolve, reject) => {
    const unzip = spawn("unzip", ["-p", zipPath, "drug-ndc-0001-of-0001.json"]);
    let buffer = "";

    unzip.on("error", reject);
    unzip.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      if (text.trim()) {
        reject(new Error(text.trim()));
      }
    });

    unzip.stdout.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const match = buffer.match(/"last_updated"\s*:\s*"([^"]+)"/);
      if (match) {
        unzip.kill("SIGTERM");
        resolve(match[1]);
      }
      if (buffer.length > 8192) {
        buffer = buffer.slice(-4096);
      }
    });

    unzip.on("close", (code, signal) => {
      if (signal === "SIGTERM") {
        return;
      }

      if (code !== 0) {
        reject(new Error("Unable to read the openFDA NDC dataset metadata."));
        return;
      }

      const match = buffer.match(/"last_updated"\s*:\s*"([^"]+)"/);
      resolve(match ? match[1] : null);
    });
  });
}

async function buildSnapshotFromZip(zipPath, sourceLastUpdated) {
  return new Promise((resolve, reject) => {
    const aggregator = createMedicationAggregator();
    const unzip = spawn("unzip", ["-p", zipPath, "drug-ndc-0001-of-0001.json"]);
    const pipeline = chain([unzip.stdout, parser(), pick({ filter: "results" }), streamArray()]);

    unzip.on("error", reject);
    unzip.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8").trim();
      if (text) {
        reject(new Error(text));
      }
    });

    pipeline.on("data", ({ value }) => {
      aggregator.ingest(value);
    });

    pipeline.on("error", reject);
    pipeline.on("end", () => {
      resolve(
        aggregator.finalize({
          sourceLastUpdated,
        }),
      );
    });
  });
}

async function main() {
  const zipPath = await downloadBulkZip(OPENFDA_NDC_BULK_URL);
  const sourceLastUpdated = await parseDatasetLastUpdated(zipPath);
  const snapshot = await buildSnapshotFromZip(zipPath, sourceLastUpdated);

  await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const serialized = `${JSON.stringify(snapshot)}\n`;
  await fs.writeFile(SNAPSHOT_PATH, zlib.gzipSync(serialized));

  console.log(
    JSON.stringify(
      {
        snapshotPath: SNAPSHOT_PATH,
        sourceLastUpdated,
        counts: snapshot.counts,
        featuredMedicationIds: snapshot.featuredMedicationIds.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
