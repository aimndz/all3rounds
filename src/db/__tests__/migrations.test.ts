// @vitest-environment node

import { execFile } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const appRoot = path.resolve(import.meta.dirname, "../../..");
const migrationDirectory = path.join(appRoot, "migrations");
const migrationNames = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const targetMigration = "0010_annotation_text_targets.sql";
const wranglerCli = path.join(appRoot, "node_modules/wrangler/bin/wrangler.js");
const temporaryDirectories: string[] = [];

type QueryResult = {
  success: boolean;
  results: Record<string, unknown>[];
};

function createDatabase() {
  const directory = mkdtempSync(path.join(tmpdir(), "all3rounds-migrations-"));
  temporaryDirectories.push(directory);
  const migrations = path.join(directory, "migrations");
  mkdirSync(migrations);
  writeFileSync(
    path.join(directory, "wrangler.json"),
    JSON.stringify({
      name: "all3rounds-migration-test",
      compatibility_date: "2024-09-23",
      d1_databases: [
        {
          binding: "DB",
          database_name: "migration-test",
          database_id: "11111111-1111-4111-8111-111111111111",
          migrations_dir: "migrations",
        },
      ],
    }),
  );

  async function run(args: string[]) {
    return execFileAsync(
      process.execPath,
      [
        wranglerCli,
        "d1",
        ...args,
        "--local",
        "--config",
        path.join(directory, "wrangler.json"),
        "--persist-to",
        path.join(directory, "state"),
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          CI: "true",
          CLOUDFLARE_ENV: "",
          CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
          WRANGLER_SEND_METRICS: "false",
          WRANGLER_LOG_PATH: path.join(directory, "logs"),
        },
        encoding: "utf8",
        timeout: 60_000,
        windowsHide: true,
      },
    );
  }

  return {
    copyMigrations(names: string[]) {
      for (const name of names) {
        copyFileSync(
          path.join(migrationDirectory, name),
          path.join(migrations, name),
        );
      }
    },
    apply() {
      return run(["migrations", "apply", "DB"]);
    },
    async query(sql: string): Promise<QueryResult[]> {
      const { stdout } = await run([
        "execute",
        "DB",
        "--command",
        sql,
        "--json",
      ]);
      const result: QueryResult[] = JSON.parse(stdout);
      expect(result.every((statement) => statement.success)).toBe(true);
      return result;
    },
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    // Delete only direct children of the temp directory created by this fixture.
    if (
      path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) ||
      !path.basename(directory).startsWith("all3rounds-migrations-")
    ) {
      throw new Error(
        `Refusing to remove unexpected test directory: ${directory}`,
      );
    }
    rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
});

describe("D1 migration history", () => {
  it("replays every migration on a fresh database", async () => {
    const database = createDatabase();
    database.copyMigrations(migrationNames);

    await database.apply();

    const [columns, history] = await database.query(`
      PRAGMA table_info(annotation_line_ranges);
      SELECT name FROM d1_migrations ORDER BY name;
    `);
    expect(columns.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "start_text_offset", type: "INTEGER" }),
        expect.objectContaining({ name: "end_text_offset", type: "INTEGER" }),
        expect.objectContaining({ name: "selected_text", type: "TEXT" }),
      ]),
    );
    expect(history.results.map((row) => row.name)).toEqual(migrationNames);
  }, 120_000);

  it("resumes after original 0009 and preserves data on repeated application", async () => {
    const database = createDatabase();
    database.copyMigrations(
      migrationNames.filter((name) => name < targetMigration),
    );
    await database.apply();
    await database.query(`
      INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
        VALUES ('user-1', 'Test author', 'author@example.test', 0, 1, 1);
      INSERT INTO user_profiles (id) VALUES ('user-1');
      INSERT INTO battles (id, slug, title, youtube_id)
        VALUES ('battle-1', 'test-battle', 'Test battle', 'test-video');
      INSERT INTO lines (id, battle_id, content, start_time, end_time)
        VALUES (1, 'battle-1', 'di ka na', 0, 1);
      INSERT INTO annotations (id, battle_id, author_id, body_json, body_text)
        VALUES ('annotation-1', 'battle-1', 'user-1', '{}', 'Existing annotation');
      INSERT INTO annotation_line_ranges (
        id, annotation_id, battle_id, start_line_id, end_line_id,
        start_line_sort, end_line_sort, start_text_offset, end_text_offset,
        selected_text, line_snapshot_json
      ) VALUES ('range-1', 'annotation-1', 'battle-1', 1, 1, 1, 1, 3, 5, 'ka', '[]');
      INSERT INTO annotation_votes (id, annotation_id, user_id)
        VALUES ('vote-1', 'annotation-1', 'user-1');
    `);
    const snapshotSql = `
      SELECT * FROM annotations ORDER BY id;
      SELECT * FROM annotation_line_ranges ORDER BY id;
      SELECT * FROM annotation_votes ORDER BY id;
    `;
    const before = (await database.query(snapshotSql)).map(
      (result) => result.results,
    );

    database.copyMigrations(
      migrationNames.filter((name) => name >= targetMigration),
    );
    await database.apply();
    expect(
      (await database.query(snapshotSql)).map((result) => result.results),
    ).toEqual(before);

    const historySql = "SELECT * FROM d1_migrations ORDER BY name;";
    const [history] = await database.query(historySql);
    expect(history.results.map((row) => row.name)).toEqual(migrationNames);
    const repeated = await database.apply();
    expect(repeated.stdout).toMatch(/no migrations to apply/i);
    const afterRepeat = await database.query(snapshotSql + historySql);
    expect(afterRepeat.map((result) => result.results)).toEqual([
      ...before,
      history.results,
    ]);
  }, 120_000);

  it("rejects missing target columns without recording 0010 as applied", async () => {
    const database = createDatabase();
    database.copyMigrations([targetMigration]);
    await database.query(`
      CREATE TABLE annotation_line_ranges (id TEXT PRIMARY KEY);
      INSERT INTO annotation_line_ranges (id) VALUES ('existing-range');
    `);

    await expect(database.apply()).rejects.toThrow(
      /no such column: start_text_offset/i,
    );

    const [history, rows] = await database.query(`
      SELECT name FROM d1_migrations;
      SELECT * FROM annotation_line_ranges;
    `);
    expect(history.results).toEqual([]);
    expect(rows.results).toEqual([{ id: "existing-range" }]);
  }, 120_000);
});
