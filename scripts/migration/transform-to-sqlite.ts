import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeEmceeSlug } from "../../src/lib/emcees";

type MigrationRow = Record<string, unknown>;
type EmceeExportRow = MigrationRow & {
  id: string;
  slug: string;
  name: string;
  aka?: string[] | null;
  battle_count?: number | null;
  created_at?: string | null;
};
type LineExportRow = MigrationRow & {
  id: number;
  battle_id: string;
  emcee_id?: string | null;
  round_number?: number | null;
  speaker_label?: string | null;
  content: string;
  start_time: number;
  end_time: number;
  created_at?: string | null;
  speaker_ids?: string[] | null;
};

const inputDir = process.env.MIGRATION_INPUT_DIR ?? "migration-data";
const outputDir = process.env.MIGRATION_SQLITE_DIR ?? "migration-data/sqlite";

function toEpoch(value: string | null | undefined) {
  return value ? new Date(value).getTime() : null;
}

async function readRows<T>(name: string): Promise<T[]> {
  return JSON.parse(await readFile(join(inputDir, `${name}.json`), "utf8")) as T[];
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const emcees = await readRows<EmceeExportRow>("emcees");
  const lines = await readRows<LineExportRow>("lines");

  const transformedEmcees = emcees.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    aka_json: JSON.stringify(row.aka ?? []),
    battle_count: row.battle_count ?? 0,
    created_at: toEpoch(row.created_at),
  }));
  const emceeAliases = emcees.flatMap((row) =>
    (row.aka ?? []).map((alias) => ({
      emcee_id: row.id,
      alias,
      alias_normalized: normalizeEmceeSlug(alias),
    })),
  );
  const transformedLines = lines.map((row) => ({
    id: row.id,
    battle_id: row.battle_id,
    emcee_id: row.emcee_id,
    round_number: row.round_number,
    speaker_label: row.speaker_label,
    content: row.content,
    start_time: row.start_time,
    end_time: row.end_time,
    created_at: toEpoch(row.created_at),
  }));
  const lineSpeakers = lines.flatMap((row) =>
    (row.speaker_ids ?? []).map((emceeId) => ({
      line_id: row.id,
      emcee_id: emceeId,
    })),
  );

  await writeFile(join(outputDir, "emcees.json"), JSON.stringify(transformedEmcees, null, 2));
  await writeFile(join(outputDir, "emcee_aliases.json"), JSON.stringify(emceeAliases, null, 2));
  await writeFile(join(outputDir, "lines.json"), JSON.stringify(transformedLines, null, 2));
  await writeFile(join(outputDir, "line_speakers.json"), JSON.stringify(lineSpeakers, null, 2));

  const passthroughColumns: Record<string, string[]> = {
    battles: ["id", "league", "slug", "title", "youtube_id", "event_name", "event_date", "status", "created_at"],
    battle_participants: ["id", "battle_id", "emcee_id", "label"],
    edit_history: ["id", "line_id", "user_id", "field_changed", "old_value", "new_value", "created_at"],
    user_profiles: ["id", "role", "trust_level", "display_name", "created_at", "updated_at"],
    suggestions: ["id", "line_id", "user_id", "suggested_content", "original_content", "status", "reviewed_by", "review_note", "created_at", "reviewed_at"],
    video_processing_status: ["youtube_id", "status", "worker_id", "started_at", "updated_at"],
    user: ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"],
    session: ["id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId"],
    account: ["id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"],
    verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
  };

  for (const [name, columns] of Object.entries(passthroughColumns)) {
    const rows = await readRows<MigrationRow>(name);
    const transformed = rows.map((row) =>
      Object.fromEntries(
        columns.map((key) => [
          key,
          /(?:_at|At)$/.test(key)
            ? toEpoch(row[key] as string | null | undefined)
            : row[key],
        ]),
      ),
    );
    await writeFile(join(outputDir, `${name}.json`), JSON.stringify(transformed, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
