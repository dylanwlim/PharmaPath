import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_PATH = path.join(process.cwd(), "data", "medication-index.snapshot.json.gz");
const TARGET_PATH = path.join(process.cwd(), "public", "medication-index.snapshot.json.gz");

async function ensureRuntimeSnapshot() {
  const sourceStat = await fs.stat(SOURCE_PATH);
  let targetStat = null;

  try {
    targetStat = await fs.stat(TARGET_PATH);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }

  if (
    targetStat &&
    targetStat.size === sourceStat.size &&
    targetStat.mtimeMs >= sourceStat.mtimeMs
  ) {
    return;
  }

  await fs.mkdir(path.dirname(TARGET_PATH), { recursive: true });
  await fs.copyFile(SOURCE_PATH, TARGET_PATH);
}

ensureRuntimeSnapshot().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
