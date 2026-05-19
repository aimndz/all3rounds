import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = process.env.MIGRATION_INPUT_DIR ?? "migration-data";
const sqliteDir = process.env.MIGRATION_SQLITE_DIR ?? "migration-data/sqlite";

type SourceEmceeRow = {
  aka?: unknown[] | null;
};

type SourceLineRow = {
  speaker_ids?: unknown[] | null;
};

async function readRows(name: string, baseDir: string) {
  return JSON.parse(await readFile(join(baseDir, `${name}.json`), "utf8")) as unknown[];
}

const checks = [
  ["emcees", "emcees"],
  ["battles", "battles"],
  ["battle_participants", "battle_participants"],
  ["lines", "lines"],
  ["edit_history", "edit_history"],
  ["user_profiles", "user_profiles"],
  ["suggestions", "suggestions"],
  ["video_processing_status", "video_processing_status"],
  ["user", "user"],
  ["session", "session"],
  ["account", "account"],
  ["verification", "verification"],
] as const;

async function main() {
  let failed = false;
  for (const [sourceName, targetName] of checks) {
    const sourceRows = await readRows(sourceName, sourceDir);
    const targetRows = await readRows(targetName, sqliteDir);
    const ok = sourceRows.length === targetRows.length;
    console.log(`${ok ? "OK" : "MISMATCH"} ${sourceName}: ${sourceRows.length} -> ${targetRows.length}`);
    failed ||= !ok;
  }

  const sourceEmcees = (await readRows("emcees", sourceDir)) as SourceEmceeRow[];
  const sourceLines = (await readRows("lines", sourceDir)) as SourceLineRow[];
  const aliasRows = await readRows("emcee_aliases", sqliteDir);
  const lineSpeakerRows = await readRows("line_speakers", sqliteDir);

  const expectedAliases = sourceEmcees.reduce((count, row) => count + (row.aka?.length ?? 0), 0);
  const expectedLineSpeakers = sourceLines.reduce((count, row) => count + (row.speaker_ids?.length ?? 0), 0);

  if (aliasRows.length !== expectedAliases) {
    console.log(`MISMATCH emcee_aliases: expected ${expectedAliases}, got ${aliasRows.length}`);
    failed = true;
  }
  if (lineSpeakerRows.length !== expectedLineSpeakers) {
    console.log(`MISMATCH line_speakers: expected ${expectedLineSpeakers}, got ${lineSpeakerRows.length}`);
    failed = true;
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
