import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Row = Record<string, unknown>;

const inputDir = process.env.MIGRATION_SQLITE_DIR ?? "migration-data/sqlite";
const outputDir = process.env.MIGRATION_D1_SQL_DIR ?? "migration-data/d1-sql";
const maxStatementBytes = 90_000;

const tableColumns: Record<string, string[]> = {
  user: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
  session: ["id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId"],
  account: ["id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"],
  verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
  user_profiles: ["id", "role", "trust_level", "display_name", "created_at", "updated_at"],
  emcees: ["id", "slug", "name", "aka_json", "battle_count", "created_at"],
  emcee_aliases: ["emcee_id", "alias", "alias_normalized"],
  battles: ["id", "league", "slug", "title", "youtube_id", "event_name", "event_date", "status", "created_at"],
  battle_participants: ["id", "battle_id", "emcee_id", "label"],
  lines: ["id", "battle_id", "emcee_id", "round_number", "speaker_label", "content", "start_time", "end_time", "created_at"],
  line_speakers: ["line_id", "emcee_id"],
  edit_history: ["id", "line_id", "user_id", "field_changed", "old_value", "new_value", "created_at"],
  suggestions: ["id", "line_id", "user_id", "suggested_content", "original_content", "status", "reviewed_by", "review_note", "created_at", "reviewed_at"],
  video_processing_status: ["youtube_id", "status", "worker_id", "started_at", "updated_at"],
};

const importOrder = Object.keys(tableColumns);

async function readRows(name: string): Promise<Row[]> {
  return JSON.parse(await readFile(join(inputDir, `${name}.json`), "utf8")) as Row[];
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlValue(value: unknown) {
  if (value == null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildStatements(table: string, columns: string[], rows: Row[]) {
  const prefix = `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(", ")}) VALUES `;
  const statements: string[] = [];
  let values: string[] = [];
  let currentBytes = Buffer.byteLength(prefix) + 1;

  for (const row of rows) {
    const tuple = `(${columns.map((column) => sqlValue(row[column])).join(", ")})`;
    const tupleBytes = Buffer.byteLength(tuple) + (values.length ? 2 : 0);
    if (values.length && currentBytes + tupleBytes > maxStatementBytes) {
      statements.push(`${prefix}${values.join(", ")};`);
      values = [];
      currentBytes = Buffer.byteLength(prefix) + 1;
    }
    values.push(tuple);
    currentBytes += tupleBytes;
  }

  if (values.length) statements.push(`${prefix}${values.join(", ")};`);
  return statements;
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  for (const table of importOrder) {
    const rows = await readRows(table);
    const statements = buildStatements(table, tableColumns[table], rows);
    const sql = ["PRAGMA defer_foreign_keys = true;", ...statements, ""].join("\n");
    await writeFile(join(outputDir, `${table}.sql`), sql);
    console.log(`${table}: ${rows.length} rows -> ${statements.length} statements`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
