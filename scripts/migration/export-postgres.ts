import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

const outputDir = process.env.MIGRATION_INPUT_DIR ?? "migration-data";
const databaseUrl = process.env.DATABASE_URL;

const tables = [
  "emcees",
  "battles",
  "battle_participants",
  "lines",
  "edit_history",
  "user_profiles",
  "suggestions",
  "video_processing_status",
  "user",
  "session",
  "account",
  "verification",
] as const;

async function main() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the one-time Postgres export.");
  }

  await mkdir(outputDir, { recursive: true });
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  try {
    for (const table of tables) {
      const result = await client.query(`SELECT * FROM "${table}"`);
      await writeFile(
        join(outputDir, `${table}.json`),
        JSON.stringify(result.rows, null, 2),
      );
      console.log(`${table}: exported ${result.rowCount ?? result.rows.length} rows`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
