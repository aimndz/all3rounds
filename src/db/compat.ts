import { getD1Async, getSearchCache } from "@/db/client";
import { normalizeEmceeSlug } from "@/lib/emcees";

type Row = Record<string, unknown>;
type CompatData = ReturnType<typeof JSON.parse>;
type CompatError = Error & { code?: string };
type CompatResponse = {
  data: CompatData | null;
  error: CompatError | null;
  count: number | null;
};
type MutationResponse = Omit<CompatResponse, "count"> & {
  count?: number | null;
};
type SearchCandidate = {
  id: number;
  rank: number;
};
type SearchCachePayload = {
  version: 2;
  query: string;
  candidates: SearchCandidate[];
  createdAt: number;
};
type Filter =
  | { kind: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"; column: string; value: unknown }
  | { kind: "in"; column: string; value: unknown[] }
  | { kind: "ilike" | "like"; column: string; value: string }
  | { kind: "is"; column: string; value: null }
  | { kind: "or"; clauses: OrClause[] };
type OrClause =
  | { kind: "eq" | "neq" | "ilike" | "like"; column: string; value: unknown }
  | { kind: "in"; column: string; value: unknown[] }
  | { kind: "is"; column: string; value: null }
  | { kind: "contains"; column: "aka"; value: string };
type Order = {
  column: string;
  ascending: boolean;
  foreignTable?: string;
  nullsFirst?: boolean;
};
type MutationMode = "select" | "insert" | "update" | "delete" | "upsert";
type SingleMode = "many" | "single" | "maybeSingle";
const MAX_IN_PARAMS = 100;
const SEARCH_CACHE_TTL_SECONDS = 60 * 60 * 24;
const SEARCH_CANDIDATE_LIMIT = 500;
const SEARCH_BROAD_SENTINEL_LIMIT = SEARCH_CANDIDATE_LIMIT + 1;
const SEARCH_RANK_POOL_LIMIT = 1000;
const SEARCH_CACHE_VERSION = 2;

const TABLES = new Set([
  "emcees",
  "emcee_aliases",
  "battles",
  "battle_participants",
  "lines",
  "line_speakers",
  "edit_history",
  "suggestions",
  "user_profiles",
  "video_processing_status",
  "user",
  "session",
  "account",
  "verification",
]);

function assertTable(table: string) {
  if (!TABLES.has(table)) throw new Error(`Unsupported D1 table: ${table}`);
}

function toIso(value: unknown) {
  return typeof value === "number" ? new Date(value).toISOString() : value;
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function compatData(value: unknown): CompatData {
  return value as CompatData;
}

export function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFtsQuery(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `"${part.replace(/"/g, '""')}"`)
    .join(" ");
}

function tokenizeSearchTerm(value: string) {
  return normalizeSearchTerm(value).split(" ").filter(Boolean);
}

async function hashSearchTerm(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getSearchCacheKey(normalizedTerm: string) {
  const readable = normalizedTerm
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `search:v${SEARCH_CACHE_VERSION}:${readable || "query"}:${await hashSearchTerm(normalizedTerm)}`;
}

function parseSearchCachePayload(raw: string | null, normalizedTerm: string) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SearchCachePayload>;
    if (
      parsed.version !== SEARCH_CACHE_VERSION ||
      parsed.query !== normalizedTerm ||
      !Array.isArray(parsed.candidates)
    ) {
      return null;
    }
    const candidates = parsed.candidates
      .map((candidate) => ({
        id: Number(candidate.id),
        rank: Number(candidate.rank),
      }))
      .filter(
        (candidate): candidate is SearchCandidate =>
          Number.isInteger(candidate.id) && Number.isFinite(candidate.rank),
      )
      .slice(0, SEARCH_CANDIDATE_LIMIT);
    return { ...parsed, candidates } as SearchCachePayload;
  } catch {
    return null;
  }
}

async function readCachedSearchCandidates(normalizedTerm: string) {
  const cache = await getSearchCache();
  if (!cache) return null;

  const key = await getSearchCacheKey(normalizedTerm);
  const payload = parseSearchCachePayload(await cache.get(key), normalizedTerm);
  if (process.env.APP_ENV === "development" && payload) {
    console.info(`[D1] search_cache=hit candidates=${payload.candidates.length}`);
  }
  return payload?.candidates ?? null;
}

async function writeCachedSearchCandidates(
  normalizedTerm: string,
  candidates: SearchCandidate[],
) {
  const cache = await getSearchCache();
  if (!cache) return;

  const key = await getSearchCacheKey(normalizedTerm);
  const payload: SearchCachePayload = {
    version: SEARCH_CACHE_VERSION,
    query: normalizedTerm,
    candidates,
    createdAt: Date.now(),
  };
  await cache.put(key, JSON.stringify(payload), {
    expirationTtl: SEARCH_CACHE_TTL_SECONDS,
  });
}

export function getSearchMode(normalizedTerm: string) {
  const tokens = tokenizeSearchTerm(normalizedTerm);
  if (tokens.length !== 1) return "multi_token" as const;
  return "broad_single" as const;
}

function normalizedField(row: Row, key: string) {
  const value = row[key];
  return typeof value === "string" ? normalizeSearchTerm(value) : "";
}

function tokenPositions(words: string[], token: string) {
  const positions: number[] = [];
  words.forEach((word, index) => {
    if (word === token) positions.push(index);
  });
  return positions;
}

function hasTokensInOrder(words: string[], tokens: string[]) {
  let cursor = 0;
  for (const word of words) {
    if (word === tokens[cursor]) cursor += 1;
    if (cursor === tokens.length) return true;
  }
  return false;
}

function proximityScore(words: string[], tokens: string[]) {
  const firstPositions = tokens
    .map((token) => tokenPositions(words, token)[0])
    .filter((position): position is number => typeof position === "number");
  if (firstPositions.length !== tokens.length) return 0;

  const span = Math.max(...firstPositions) - Math.min(...firstPositions) + 1;
  if (span <= tokens.length) return 1000;
  if (span <= tokens.length + 2) return 700;
  if (span <= tokens.length + 6) return 400;
  if (span <= tokens.length + 12) return 150;
  return 0;
}

function eventDateTieBreaker(value: unknown) {
  if (typeof value !== "string") return 0;
  const year = Number(value.slice(0, 4));
  if (!Number.isFinite(year)) return 0;
  return Math.max(0, Math.min(25, year - 2000));
}

export function scoreSearchRow(row: Row, normalizedTerm: string) {
  const tokens = tokenizeSearchTerm(normalizedTerm);
  const content = normalizedField(row, "content");
  const contentWords = content.split(" ").filter(Boolean);
  const exactPhrase = content.includes(normalizedTerm);
  const matchedTokens = tokens.filter((token) => contentWords.includes(token));
  const allTokens = tokens.length > 0 && matchedTokens.length === tokens.length;
  const orderedTokens = tokens.length > 1 && hasTokensInOrder(contentWords, tokens);

  let score = 0;
  if (exactPhrase) score += 10_000;
  if (orderedTokens) score += 4_000;
  if (allTokens) score += 2_500;
  score += matchedTokens.length * 300;
  score += proximityScore(contentWords, tokens);

  const speaker = normalizedField(row, "speaker_label");
  const emcee = normalizedField(row, "emcee_name");
  const title = normalizedField(row, "battle_title");
  const eventName = normalizedField(row, "battle_event_name");
  const metadata = [speaker, emcee, title, eventName].filter(Boolean).join(" ");

  if (tokens.some((token) => speaker.split(" ").includes(token) || emcee.split(" ").includes(token))) {
    score += 500;
  }
  if (tokens.some((token) => title.split(" ").includes(token) || eventName.split(" ").includes(token))) {
    score += 300;
  }
  if (row.battle_status === "reviewed") score += 100;
  else if (row.battle_status === "reviewing") score += 50;
  if (typeof row.emcee_id === "string" && row.emcee_id) score += 25;
  if (metadata.includes(normalizedTerm)) score += 150;
  score += eventDateTieBreaker(row.battle_event_date);
  score -= Math.min(300, Math.max(0, contentWords.length - 18) * 6);

  return score;
}

export function scoreSingleTokenSearchRow(
  row: Row,
  normalizedTerm: string,
  originalRank = 0,
) {
  const content = normalizedField(row, "content");
  const contentWords = content.split(" ").filter(Boolean);
  const speaker = normalizedField(row, "speaker_label");
  const emcee = normalizedField(row, "emcee_name");
  const title = normalizedField(row, "battle_title");
  const eventName = normalizedField(row, "battle_event_name");

  let score = 0;
  if (speaker === normalizedTerm || emcee === normalizedTerm) score += 2_000;
  if (speaker.split(" ").includes(normalizedTerm) || emcee.split(" ").includes(normalizedTerm)) {
    score += 1_000;
  }
  if (title === normalizedTerm || eventName === normalizedTerm) score += 700;
  if (title.split(" ").includes(normalizedTerm) || eventName.split(" ").includes(normalizedTerm)) {
    score += 350;
  }
  if (row.battle_status === "reviewed") score += 100;
  else if (row.battle_status === "reviewing") score += 50;
  if (typeof row.emcee_id === "string" && row.emcee_id) score += 25;
  score += eventDateTieBreaker(row.battle_event_date);
  score -= Math.min(150, Math.max(0, contentWords.length - 18) * 3);
  score -= originalRank / 10_000;

  return score;
}

function normalizeDateInput(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).getTime();
  }
  return value;
}

function publicRow(table: string, row: Row): Row {
  if (table === "battles") {
    return {
      ...row,
      url: `https://www.youtube.com/watch?v=${String(row.youtube_id)}`,
      created_at: toIso(row.created_at),
    };
  }
  if (table === "emcees") {
    return {
      ...row,
      aka: parseJsonArray(row.aka_json),
      created_at: toIso(row.created_at),
    };
  }
  if (
    table === "lines" ||
    table === "edit_history" ||
    table === "suggestions" ||
    table === "user_profiles" ||
    table === "video_processing_status"
  ) {
    return {
      ...row,
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
      reviewed_at: toIso(row.reviewed_at),
      started_at: toIso(row.started_at),
    };
  }
  if (table === "user" || table === "session" || table === "account" || table === "verification") {
    return {
      ...row,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
      expiresAt: toIso(row.expiresAt),
      accessTokenExpiresAt: toIso(row.accessTokenExpiresAt),
      refreshTokenExpiresAt: toIso(row.refreshTokenExpiresAt),
    };
  }
  return row;
}

function projectRow(row: Row, columns?: string) {
  if (!columns || columns.trim() === "*" || columns.includes("(") || columns.includes(":")) {
    return row;
  }
  const selected = columns.split(",").map((column) => column.trim()).filter(Boolean);
  return Object.fromEntries(selected.map((column) => [column, row[column]]));
}

function splitTopLevel(input: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && next === '"') {
      current += char + next;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if (!inQuotes && char === "(") depth += 1;
    if (!inQuotes && char === ")") depth = Math.max(depth - 1, 0);

    if (!inQuotes && depth === 0 && char === ",") {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseOrExpression(input: string): OrClause[] {
  return splitTopLevel(input)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const isNullMatch = part.match(/^([a-zA-Z0-9_]+)\.is\.null$/);
      if (isNullMatch) return { kind: "is", column: isNullMatch[1], value: null };

      const inMatch = part.match(/^([a-zA-Z0-9_]+)\.in\.\((.*)\)$/);
      if (inMatch) {
        return {
          kind: "in",
          column: inMatch[1],
          value: splitTopLevel(inMatch[2])
            .map((value) => value.trim().replace(/^"|"$/g, "").replace(/""/g, '"')),
        };
      }

      const containsMatch = part.match(/^aka\.cs\.\{"(.*)"\}$/);
      if (containsMatch) return { kind: "contains", column: "aka", value: containsMatch[1] };

      const match = part.match(/^([a-zA-Z0-9_]+)\.(eq|neq|ilike|like)\.(.*)$/);
      if (!match) throw new Error(`Unsupported OR expression: ${part}`);
      return {
        kind: match[2] as "eq" | "neq" | "ilike" | "like",
        column: match[1],
        value: match[3],
      };
    });
}

function buildWhere(filters: Filter[]) {
  const params: unknown[] = [];
  const clauses = filters.map((filter) => {
    switch (filter.kind) {
      case "eq":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} = ?`;
      case "neq":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} <> ?`;
      case "lt":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} < ?`;
      case "lte":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} <= ?`;
      case "gt":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} > ?`;
      case "gte":
        params.push(normalizeDateInput(filter.value));
        return `${quoteIdent(filter.column)} >= ?`;
      case "in":
        params.push(...filter.value.map(normalizeDateInput));
        return `${quoteIdent(filter.column)} IN (${filter.value.map(() => "?").join(", ")})`;
      case "ilike":
      case "like":
        params.push(filter.value);
        return `${quoteIdent(filter.column)} LIKE ? ESCAPE '\\' COLLATE NOCASE`;
      case "is":
        return `${quoteIdent(filter.column)} IS NULL`;
      case "or": {
        const parts = filter.clauses.map((clause) => {
          switch (clause.kind) {
            case "eq":
              params.push(normalizeDateInput(clause.value));
              return `${quoteIdent(clause.column)} = ?`;
            case "neq":
              params.push(normalizeDateInput(clause.value));
              return `${quoteIdent(clause.column)} <> ?`;
            case "ilike":
            case "like":
              params.push(String(clause.value));
              return `${quoteIdent(clause.column)} LIKE ? ESCAPE '\\' COLLATE NOCASE`;
            case "in":
              params.push(...clause.value.map(normalizeDateInput));
              return `${quoteIdent(clause.column)} IN (${clause.value.map(() => "?").join(", ")})`;
            case "is":
              return `${quoteIdent(clause.column)} IS NULL`;
            case "contains":
              params.push(normalizeEmceeSlug(clause.value));
              return `EXISTS (
                SELECT 1 FROM emcee_aliases ea
                WHERE ea.emcee_id = emcees.id AND ea.alias_normalized = ?
              )`;
          }
        });
        return `(${parts.join(" OR ")})`;
      }
    }
  });
  return {
    sql: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

async function fetchRows(sql: string, params: unknown[] = []): Promise<Row[]> {
  const result = await (await getD1Async()).prepare(sql).bind(...params).all();
  logD1Usage(sql, result.meta);
  return result.results ?? [];
}

async function fetchFirst(sql: string, params: unknown[] = []): Promise<Row | null> {
  const statement = (await getD1Async()).prepare(sql).bind(...params);
  const row = await statement.first();
  return row;
}

function logD1Usage(sql: string, meta?: { rows_read?: number; rows_written?: number; duration?: number }) {
  if (process.env.APP_ENV !== "development") return;
  const rowsRead = meta?.rows_read ?? 0;
  const rowsWritten = meta?.rows_written ?? 0;
  if (rowsRead < 1000 && rowsWritten === 0) return;

  const compactSql = sql.replace(/\s+/g, " ").trim().slice(0, 180);
  console.info(
    `[D1] rows_read=${rowsRead} rows_written=${rowsWritten} duration=${meta?.duration ?? "?"}ms sql="${compactSql}"`,
  );
}

async function fetchRowsByIn(table: string, column: string, values: unknown[]) {
  const rows: Row[] = [];
  for (let index = 0; index < values.length; index += MAX_IN_PARAMS) {
    const chunk = values.slice(index, index + MAX_IN_PARAMS);
    if (!chunk.length) continue;
    const placeholders = chunk.map(() => "?").join(", ");
    rows.push(
      ...(await fetchRows(
        `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(column)} IN (${placeholders})`,
        chunk,
      )),
    );
  }
  return rows;
}

async function fetchGroupedCounts(table: string, column: string, values: unknown[]) {
  const rows: Row[] = [];
  for (let index = 0; index < values.length; index += MAX_IN_PARAMS) {
    const chunk = values.slice(index, index + MAX_IN_PARAMS);
    if (!chunk.length) continue;
    const placeholders = chunk.map(() => "?").join(", ");
    rows.push(
      ...(await fetchRows(
        `SELECT ${quoteIdent(column)}, COUNT(*) AS count FROM ${quoteIdent(table)}
         WHERE ${quoteIdent(column)} IN (${placeholders}) GROUP BY ${quoteIdent(column)}`,
        chunk,
      )),
    );
  }
  return rows;
}

function compareValues(left: unknown, right: unknown, ascending: boolean) {
  if (left == null && right == null) return 0;
  if (left == null) return ascending ? 1 : -1;
  if (right == null) return ascending ? -1 : 1;
  const result = String(left).localeCompare(String(right));
  return ascending ? result : -result;
}

async function attachEmcees(rows: Row[], sourceKey: string, targetKey: string) {
  const ids = Array.from(
    new Set(rows.map((row) => row[sourceKey]).filter((value): value is string => typeof value === "string")),
  );
  if (!ids.length) {
    rows.forEach((row) => {
      row[targetKey] = null;
    });
    return;
  }
  const emceeRows = await fetchRowsByIn("emcees", "id", ids);
  const byId = new Map(emceeRows.map((row) => [String(row.id), publicRow("emcees", row)]));
  rows.forEach((row) => {
    row[targetKey] = byId.get(String(row[sourceKey])) ?? null;
  });
}

async function attachProfiles(rows: Row[], sourceKey: string, targetKey: string) {
  const ids = Array.from(
    new Set(rows.map((row) => row[sourceKey]).filter((value): value is string => typeof value === "string")),
  );
  if (!ids.length) {
    rows.forEach((row) => {
      row[targetKey] = null;
    });
    return;
  }
  const profileRows = await fetchRowsByIn("user_profiles", "id", ids);
  const byId = new Map(profileRows.map((row) => [String(row.id), publicRow("user_profiles", row)]));
  rows.forEach((row) => {
    row[targetKey] = byId.get(String(row[sourceKey])) ?? null;
  });
}

async function attachBattles(
  rows: Row[],
  sourceKey: string,
  targetKey: string,
  options?: { withParticipants?: boolean },
) {
  const ids = Array.from(
    new Set(rows.map((row) => row[sourceKey]).filter((value): value is string => typeof value === "string")),
  );
  if (!ids.length) {
    rows.forEach((row) => {
      row[targetKey] = null;
    });
    return;
  }
  const battleRows = await fetchRowsByIn("battles", "id", ids);
  const normalized = battleRows.map((row) => publicRow("battles", row));
  if (options?.withParticipants) await hydrateRows("battles", normalized, "battle_participants(");
  const byId = new Map(normalized.map((row) => [String(row.id), row]));
  rows.forEach((row) => {
    row[targetKey] = byId.get(String(row[sourceKey])) ?? null;
  });
}

async function hydrateRows(table: string, rows: Row[], selectSpec?: string, orders: Order[] = []) {
  if (!rows.length) return rows;
  if (table === "lines") {
    const ids = rows.map((row) => Number(row.id));
    const speakers = await fetchRowsByIn("line_speakers", "line_id", ids);
    const byLine = new Map<number, string[]>();
    speakers.forEach((speaker) => {
      const id = Number(speaker.line_id);
      const current = byLine.get(id) ?? [];
      current.push(String(speaker.emcee_id));
      byLine.set(id, current);
    });
    rows.forEach((row) => {
      row.speaker_ids = byLine.get(Number(row.id)) ?? [];
    });
    if (selectSpec?.includes("emcee:emcees")) await attachEmcees(rows, "emcee_id", "emcee");
    if (selectSpec?.includes("battle:battles")) {
      await attachBattles(rows, "battle_id", "battle", {
        withParticipants: selectSpec.includes("battle_participants"),
      });
    }
  }
  if (table === "battle_participants") {
    if (selectSpec?.includes("emcee:emcees") || selectSpec?.includes("emcees (")) {
      await attachEmcees(rows, "emcee_id", "emcee");
    }
    if (selectSpec?.includes("battles (")) {
      await attachBattles(rows, "battle_id", "battles");
      const order = orders.find((item) => item.foreignTable === "battles");
      if (order) {
        rows.sort((a, b) =>
          compareValues(
            (a.battles as Row | undefined)?.[order.column],
            (b.battles as Row | undefined)?.[order.column],
            order.ascending,
          ),
        );
      }
    }
  }
  if (table === "suggestions") {
    if (selectSpec?.includes("lines (")) {
      const ids = rows.map((row) => Number(row.line_id));
      const lineRows = await fetchRowsByIn("lines", "id", ids);
      const normalized = lineRows.map((row) => publicRow("lines", row));
      await hydrateRows("lines", normalized, "battle:battles");
      const byId = new Map(normalized.map((row) => [Number(row.id), row]));
      rows.forEach((row) => {
        row.lines = byId.get(Number(row.line_id)) ?? null;
      });
    }
    if (selectSpec?.includes("user:user_profiles")) await attachProfiles(rows, "user_id", "user");
    if (selectSpec?.includes("reviewer:user_profiles")) await attachProfiles(rows, "reviewed_by", "reviewer");
  }
  if (table === "battles" && selectSpec?.includes("battle_participants(")) {
    const ids = rows.map((row) => String(row.id));
    const participantRows = await fetchRowsByIn("battle_participants", "battle_id", ids);
    const normalized = participantRows.map((row) => publicRow("battle_participants", row));
    await hydrateRows("battle_participants", normalized, "emcee:emcees");
    const byBattle = new Map<string, Row[]>();
    normalized.forEach((participant) => {
      const current = byBattle.get(String(participant.battle_id)) ?? [];
      current.push({ ...participant, emcees: participant.emcee });
      byBattle.set(String(participant.battle_id), current);
    });
    rows.forEach((row) => {
      row.battle_participants = byBattle.get(String(row.id)) ?? [];
    });
  }
  if (table === "emcees") {
    const ids = rows.map((row) => String(row.id));
    if (selectSpec?.includes("battle_participants(count)")) {
      const counts = await fetchGroupedCounts("battle_participants", "emcee_id", ids);
      const byId = new Map(counts.map((row) => [String(row.emcee_id), Number(row.count)]));
      rows.forEach((row) => {
        row.battle_participants = [{ count: byId.get(String(row.id)) ?? 0 }];
      });
    }
    if (selectSpec?.includes("lines(count)")) {
      const counts = await fetchGroupedCounts("lines", "emcee_id", ids);
      const byId = new Map(counts.map((row) => [String(row.emcee_id), Number(row.count)]));
      rows.forEach((row) => {
        row.lines = [{ count: byId.get(String(row.id)) ?? 0 }];
      });
    }
  }
  return rows;
}

async function syncAliases(emceeId: string, aka: string[]) {
  const db = await getD1Async();
  await db.prepare("DELETE FROM emcee_aliases WHERE emcee_id = ?").bind(emceeId).run();
  if (!aka.length) return;
  await db.batch(
    aka.map((alias) =>
      db
        .prepare("INSERT INTO emcee_aliases (emcee_id, alias, alias_normalized) VALUES (?, ?, ?)")
        .bind(emceeId, alias, normalizeEmceeSlug(alias)),
    ),
  );
}

async function syncLineSpeakers(lineIds: number[], speakerIds: string[]) {
  const db = await getD1Async();
  const statements = [];
  for (const lineId of lineIds) {
    statements.push(db.prepare("DELETE FROM line_speakers WHERE line_id = ?").bind(lineId));
    speakerIds.forEach((emceeId) => {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO line_speakers (line_id, emcee_id) VALUES (?, ?)").bind(lineId, emceeId),
      );
    });
  }
  if (statements.length) await db.batch(statements);
}

async function recalcBattleCounts(emceeIds?: string[]) {
  const where = emceeIds?.length ? `WHERE id IN (${emceeIds.map(() => "?").join(", ")})` : "";
  const rows = await fetchRows(`SELECT id FROM emcees ${where}`, emceeIds ?? []);
  const db = await getD1Async();
  if (!rows.length) return;
  await db.batch(
    rows.map((row) =>
      db
        .prepare(
          `UPDATE emcees SET battle_count = (
             SELECT COUNT(*)
             FROM battle_participants bp
             JOIN battles b ON b.id = bp.battle_id
             WHERE bp.emcee_id = emcees.id AND b.status <> 'excluded'
           ) WHERE id = ?`,
        )
        .bind(row.id),
    ),
  );
}

export class D1QueryBuilder implements PromiseLike<CompatResponse | MutationResponse> {
  private mode: MutationMode = "select";
  private singleMode: SingleMode = "many";
  private selectSpec = "*";
  private selectOptions?: { count?: "exact"; head?: boolean };
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private mutationValues?: Row | Row[];
  private onConflict?: string;

  constructor(private readonly table: string) {
    assertTable(table);
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) { this.selectSpec = columns; this.selectOptions = options; return this; }
  insert(values: Row | Row[]) { this.mode = "insert"; this.mutationValues = values; return this; }
  update(values: Row) { this.mode = "update"; this.mutationValues = values; return this; }
  delete() { this.mode = "delete"; return this; }
  upsert(values: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) { this.mode = "upsert"; this.mutationValues = values; this.onConflict = options?.onConflict; return this; }
  eq(column: string, value: unknown) { this.filters.push({ kind: "eq", column, value }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ kind: "neq", column, value }); return this; }
  lt(column: string, value: unknown) { this.filters.push({ kind: "lt", column, value }); return this; }
  lte(column: string, value: unknown) { this.filters.push({ kind: "lte", column, value }); return this; }
  gt(column: string, value: unknown) { this.filters.push({ kind: "gt", column, value }); return this; }
  gte(column: string, value: unknown) { this.filters.push({ kind: "gte", column, value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ kind: "in", column, value }); return this; }
  like(column: string, pattern: string) { this.filters.push({ kind: "like", column, value: pattern }); return this; }
  ilike(column: string, pattern: string) { this.filters.push({ kind: "ilike", column, value: pattern }); return this; }
  is(column: string, value: null) { this.filters.push({ kind: "is", column, value }); return this; }
  or(expression: string) { this.filters.push({ kind: "or", clauses: parseOrExpression(expression) }); return this; }
  order(column: string, options?: { ascending?: boolean; foreignTable?: string; nullsFirst?: boolean }) { this.orders.push({ column, ascending: options?.ascending ?? true, foreignTable: options?.foreignTable, nullsFirst: options?.nullsFirst }); return this; }
  limit(value: number) { this.limitValue = value; return this; }
  range(from: number, to: number) { this.offsetValue = from; this.limitValue = Math.max(to - from + 1, 0); return this; }
  maybeSingle(): Promise<CompatResponse | MutationResponse> { this.singleMode = "maybeSingle"; return this.execute(); }
  single(): Promise<CompatResponse | MutationResponse> { this.singleMode = "single"; return this.execute(); }
  then<TResult1 = CompatResponse | MutationResponse, TResult2 = never>(
    onfulfilled?: ((value: CompatResponse | MutationResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) { return this.execute().then(onfulfilled, onrejected); }

  private async execute(): Promise<CompatResponse | MutationResponse> {
    try {
      if (this.mode === "insert") return this.executeInsert();
      if (this.mode === "update") return this.executeUpdate();
      if (this.mode === "delete") return this.executeDelete();
      if (this.mode === "upsert") return this.executeUpsert();
      return this.executeSelect();
    } catch (error) {
      return { data: null, error: error as CompatError, count: null };
    }
  }

  private async executeSelect(): Promise<CompatResponse> {
    const where = buildWhere(this.filters);
    const count = this.selectOptions?.count === "exact"
      ? Number((await fetchFirst(`SELECT COUNT(*) AS count FROM ${quoteIdent(this.table)}${where.sql}`, where.params))?.count ?? 0)
      : undefined;
    if (this.selectOptions?.head) return { data: null, error: null, count: count ?? null };
    const orderSql = this.orders.filter((order) => !order.foreignTable).map((order) => `${quoteIdent(order.column)} ${order.ascending ? "ASC" : "DESC"}`).join(", ");
    const params = [...where.params, ...(this.limitValue != null ? [this.limitValue] : []), ...(this.offsetValue != null ? [this.offsetValue] : [])];
    const rows = await fetchRows(
      `SELECT * FROM ${quoteIdent(this.table)}${where.sql}${orderSql ? ` ORDER BY ${orderSql}` : ""}${this.limitValue != null ? " LIMIT ?" : ""}${this.offsetValue != null ? " OFFSET ?" : ""}`,
      params,
    );
    const normalized = rows.map((row) => publicRow(this.table, row));
    await hydrateRows(this.table, normalized, this.selectSpec, this.orders);
    const projected = normalized.map((row) => projectRow(row, this.selectSpec));
    if (this.singleMode === "single") return projected.length === 1 ? { data: compatData(projected[0]), error: null, count: count ?? null } : { data: null, error: new Error("Expected exactly one row"), count: count ?? null };
    if (this.singleMode === "maybeSingle") return { data: projected[0] ? compatData(projected[0]) : null, error: null, count: count ?? null };
    return { data: compatData(projected), error: null, count: count ?? null };
  }

  private async executeInsert(): Promise<MutationResponse> {
    const values = Array.isArray(this.mutationValues) ? this.mutationValues : [this.mutationValues ?? {}];
    const ids: unknown[] = [];
    for (const raw of values) {
      const { data, speakerIds, aka } = this.normalizeMutationValues(raw);
      if (!data.id && ["emcees", "battle_participants", "edit_history", "suggestions", "battles"].includes(this.table)) data.id = crypto.randomUUID();
      const columns = Object.keys(data);
      const result = await (await getD1Async()).prepare(`INSERT INTO ${quoteIdent(this.table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`).bind(...columns.map((column) => data[column])).run();
      const id = data.id ?? result.meta.last_row_id;
      ids.push(id);
      if (this.table === "lines" && typeof id === "number") await syncLineSpeakers([id], speakerIds ?? []);
      if (this.table === "emcees" && typeof data.id === "string") await syncAliases(data.id, aka ?? []);
    }
    if (this.table === "battle_participants") await recalcBattleCounts(values.map((row) => String(row.emcee_id)));
    return this.returnMutationRows(ids);
  }

  private async executeUpdate(): Promise<MutationResponse> {
    const existing = await this.fetchMatchingRows();
    const { data, speakerIds, aka } = this.normalizeMutationValues(
      (this.mutationValues as Row | undefined) ?? {},
    );
    const columns = Object.keys(data);
    if (columns.length) {
      const where = buildWhere(this.filters);
      await (await getD1Async()).prepare(`UPDATE ${quoteIdent(this.table)} SET ${columns.map((column) => `${quoteIdent(column)} = ?`).join(", ")} ${where.sql}`).bind(...columns.map((column) => data[column]), ...where.params).run();
    }
    if (this.table === "lines" && speakerIds) await syncLineSpeakers(existing.map((row) => Number(row.id)), speakerIds);
    if (this.table === "emcees" && aka) await Promise.all(existing.map((row) => syncAliases(String(row.id), aka)));
    if (this.table === "battle_participants") await recalcBattleCounts(Array.from(new Set(existing.map((row) => String(row.emcee_id)).concat(data.emcee_id ? [String(data.emcee_id)] : []))));
    return this.returnMutationRows(existing.map((row) => row.id));
  }

  private async executeDelete(): Promise<MutationResponse> {
    const existing = await this.fetchMatchingRows();
    const where = buildWhere(this.filters);
    await (await getD1Async()).prepare(`DELETE FROM ${quoteIdent(this.table)}${where.sql}`).bind(...where.params).run();
    if (this.table === "battle_participants") await recalcBattleCounts(existing.map((row) => String(row.emcee_id)));
    return { data: compatData(existing), error: null };
  }

  private async executeUpsert(): Promise<MutationResponse> {
    const values = Array.isArray(this.mutationValues) ? this.mutationValues : [this.mutationValues ?? {}];
    const ids: unknown[] = [];
    for (const raw of values) {
      const { data } = this.normalizeMutationValues(raw);
      if (!data.id && ["battle_participants", "emcees"].includes(this.table)) data.id = crypto.randomUUID();
      const columns = Object.keys(data);
      const conflictColumns = this.onConflict?.split(",").map((column) => column.trim()) ?? [];
      const updates = columns.filter((column) => !conflictColumns.includes(column));
      await (await getD1Async()).prepare(`INSERT INTO ${quoteIdent(this.table)} (${columns.map(quoteIdent).join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT (${conflictColumns.map(quoteIdent).join(", ")}) DO UPDATE SET ${updates.map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`).join(", ")}`).bind(...columns.map((column) => data[column])).run();
      ids.push(data.id);
    }
    if (this.table === "battle_participants") await recalcBattleCounts(values.map((row) => String(row.emcee_id)));
    return this.returnMutationRows(ids);
  }

  private normalizeMutationValues(raw: Row) {
    const data: Row = {};
    let speakerIds: string[] | undefined;
    let aka: string[] | undefined;
    Object.entries(raw).forEach(([key, value]) => {
      if (key === "speaker_ids") speakerIds = Array.isArray(value) ? value.map(String) : [];
      else if (key === "aka") { aka = Array.isArray(value) ? value.map(String) : []; data.aka_json = JSON.stringify(aka); }
      else if (["created_at", "updated_at", "reviewed_at", "started_at"].includes(key)) data[key] = normalizeDateInput(value);
      else data[key] = value;
    });
    return { data, speakerIds, aka };
  }

  private async fetchMatchingRows() {
    const where = buildWhere(this.filters);
    return fetchRows(`SELECT * FROM ${quoteIdent(this.table)}${where.sql}`, where.params);
  }

  private async returnMutationRows(ids: unknown[]): Promise<MutationResponse> {
    if (!ids.length) return { data: compatData([]), error: null };
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await fetchRows(`SELECT * FROM ${quoteIdent(this.table)} WHERE id IN (${placeholders})`, ids);
    const normalized = rows.map((row) => publicRow(this.table, row));
    await hydrateRows(this.table, normalized, this.selectSpec, this.orders);
    const projected = normalized.map((row) => projectRow(row, this.selectSpec));
    return this.singleMode === "single" ? { data: projected[0] ? compatData(projected[0]) : null, error: null } : { data: compatData(projected), error: null };
  }
}

class D1RpcBuilder implements PromiseLike<CompatResponse | MutationResponse> {
  private from = 0;
  private to?: number;
  constructor(private readonly name: string, private readonly args?: Row, private readonly options?: { count?: "exact" }) {}
  range(from: number, to: number) { this.from = from; this.to = to; return this; }
  then<TResult1 = CompatResponse | MutationResponse, TResult2 = never>(
    onfulfilled?: ((value: CompatResponse | MutationResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) { return this.execute().then(onfulfilled, onrejected); }
  private async execute(): Promise<CompatResponse | MutationResponse> {
    try {
      if (this.name === "search_fast") return searchFast(String(this.args?.search_term ?? ""), this.from, this.to, this.options);
      if (this.name === "get_random_valid_line_ids") return randomValidLineIds(Number(this.args?.sample_size ?? 6), Array.isArray(this.args?.allowed_statuses) ? this.args.allowed_statuses.map(String) : ["reviewing"]);
      if (this.name === "get_admin_review_stats") return adminReviewStats();
      if (this.name === "merge_speaker_ids") return mergeSpeakerIds(String(this.args?.old_emcee_id), String(this.args?.new_emcee_id));
      throw new Error(`Unsupported D1 RPC: ${this.name}`);
    } catch (error) {
      return { data: null, error: error as CompatError, count: null };
    }
  }
}

async function searchFast(searchTerm: string, from: number, to?: number, options?: { count?: "exact" }): Promise<CompatResponse> {
  const normalizedTerm = normalizeSearchTerm(searchTerm);
  if (!normalizedTerm) {
    return { data: compatData([]), error: null, count: 0 };
  }

  const mode = getSearchMode(normalizedTerm);
  const candidates =
    (await readCachedSearchCandidates(normalizedTerm)) ??
    (await fetchSearchCandidates(normalizedTerm, mode));
  if (process.env.APP_ENV === "development") {
    console.info(`[D1] search_mode=${mode} candidate_count=${candidates.length}`);
  }
  const pageCandidates = candidates.slice(from, to == null ? undefined : to + 1);
  const rows = await hydrateSearchCandidates(pageCandidates);

  await hydrateRows("lines", rows, "*");
  return {
    data: compatData(rows),
    error: null,
    count: options?.count === "exact" ? candidates.length : null,
  };
}

async function fetchSearchCandidates(
  normalizedTerm: string,
  mode: ReturnType<typeof getSearchMode>,
) {
  if (mode === "broad_single") {
    return fetchBroadSingleCandidates(normalizedTerm);
  }
  return fetchMultiTokenCandidates(normalizedTerm);
}

async function fetchBroadSingleCandidates(normalizedTerm: string) {
  const query = buildFtsQuery(normalizedTerm);
  const rawCandidates = await fetchUnrankedFtsCandidates(
    query,
    SEARCH_BROAD_SENTINEL_LIMIT,
  );

  const isBroad = rawCandidates.length > SEARCH_CANDIDATE_LIMIT;
  const candidates = isBroad
    ? rawCandidates.slice(0, SEARCH_CANDIDATE_LIMIT)
    : await rankSingleTokenCandidates(normalizedTerm, rawCandidates);

  if (process.env.APP_ENV === "development" && !isBroad) {
    console.info(`[D1] single_token_ranked_count=${candidates.length}`);
  }
  await writeCachedSearchCandidates(normalizedTerm, candidates);
  return candidates;
}

async function rankSingleTokenCandidates(
  normalizedTerm: string,
  candidates: SearchCandidate[],
) {
  const rows = await hydrateSearchCandidates(candidates);
  const originalRanks = new Map(candidates.map((candidate) => [candidate.id, candidate.rank]));
  return rows
    .map((row) => {
      const id = Number(row.id);
      return {
        id,
        rank: scoreSingleTokenSearchRow(row, normalizedTerm, originalRanks.get(id) ?? 0),
      };
    })
    .filter(
      (candidate): candidate is SearchCandidate =>
        Number.isInteger(candidate.id) && Number.isFinite(candidate.rank),
    )
    .sort((left, right) => right.rank - left.rank || left.id - right.id);
}

async function fetchMultiTokenCandidates(normalizedTerm: string) {
  const pool = await fetchUnrankedFtsCandidates(
    buildFtsQuery(normalizedTerm),
    SEARCH_RANK_POOL_LIMIT,
  );
  const rows = await hydrateSearchCandidates(pool);
  if (process.env.APP_ENV === "development") {
    console.info(`[D1] rank_pool_count=${rows.length}`);
  }

  const scored = rows
    .map((row) => ({
      id: Number(row.id),
      rank: scoreSearchRow(row, normalizedTerm),
    }))
    .filter(
      (candidate): candidate is SearchCandidate =>
        Number.isInteger(candidate.id) && Number.isFinite(candidate.rank),
    )
    .sort((left, right) => right.rank - left.rank || left.id - right.id)
    .slice(0, SEARCH_CANDIDATE_LIMIT);
  await writeCachedSearchCandidates(normalizedTerm, scored);
  return scored;
}

async function fetchUnrankedFtsCandidates(query: string, limit: number) {
  const rows = await fetchRows(
    `SELECT lines_fts.rowid AS id
     FROM lines_fts
     WHERE lines_fts MATCH ?
     LIMIT ?`,
    [query, limit],
  );
  return rows
    .map((row, index) => ({
      id: Number(row.id),
      rank: index,
    }))
    .filter(
      (candidate): candidate is SearchCandidate =>
        Number.isInteger(candidate.id) && Number.isFinite(candidate.rank),
    );
}

async function hydrateSearchCandidates(candidates: SearchCandidate[]) {
  if (!candidates.length) return [];

  const ids = candidates.map((candidate) => candidate.id);
  const rows: Row[] = [];
  for (let index = 0; index < ids.length; index += MAX_IN_PARAMS) {
    const chunk = ids.slice(index, index + MAX_IN_PARAMS);
    const placeholders = chunk.map(() => "?").join(", ");
    rows.push(
      ...(await fetchRows(
        `SELECT l.id, l.content, l.start_time, l.end_time, l.round_number, l.speaker_label,
                l.emcee_id, e.name AS emcee_name, l.battle_id, b.title AS battle_title,
                b.youtube_id AS battle_youtube_id, b.event_name AS battle_event_name,
                b.event_date AS battle_event_date, b.status AS battle_status
         FROM lines l
         LEFT JOIN emcees e ON e.id = l.emcee_id
         JOIN battles b ON b.id = l.battle_id
         WHERE l.id IN (${placeholders})`,
        chunk,
      )),
    );
  }
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  return candidates.flatMap((candidate) => {
    const row = byId.get(candidate.id);
    if (!row) return [];
    row.rank = candidate.rank;
    return [row];
  });
}

async function randomValidLineIds(sampleSize: number, statuses: string[]): Promise<MutationResponse> {
  const safeSize = Math.min(Math.max(sampleSize, 1), 12);
  const placeholders = statuses.map(() => "?").join(", ");
  const rows = await fetchRows(
    `SELECT l.id FROM lines l JOIN battles b ON b.id = l.battle_id WHERE b.status IN (${placeholders}) ORDER BY random() LIMIT ?`,
    [...statuses, safeSize],
  );
  return { data: compatData(rows), error: null };
}

async function adminReviewStats(): Promise<MutationResponse> {
  const rows = await fetchRows(
    `WITH overview AS (
       SELECT
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS total_approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS total_rejected,
         SUM(CASE WHEN status IN ('approved', 'rejected') THEN 1 ELSE 0 END) AS total_reviews
       FROM suggestions
     ),
     by_moderator AS (
       SELECT s.reviewed_by, COALESCE(up.display_name, 'Unknown') AS display_name,
              COALESCE(up.role, 'unknown') AS role,
              SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN s.status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              COUNT(*) AS total, MAX(s.reviewed_at) AS last_review
       FROM suggestions s
       LEFT JOIN user_profiles up ON up.id = s.reviewed_by
       WHERE s.status IN ('approved', 'rejected') AND s.reviewed_by IS NOT NULL
       GROUP BY s.reviewed_by, up.display_name, up.role
     )
     SELECT m.reviewed_by, m.display_name, m.role, m.approved, m.rejected, m.total, m.last_review,
            o.total_approved, o.total_rejected, o.total_reviews
     FROM by_moderator m CROSS JOIN overview o ORDER BY m.total DESC`,
  );
  return { data: compatData(rows.map((row) => publicRow("suggestions", row))), error: null };
}

async function mergeSpeakerIds(oldEmceeId: string, newEmceeId: string): Promise<MutationResponse> {
  const db = await getD1Async();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO line_speakers (line_id, emcee_id) SELECT line_id, ? FROM line_speakers WHERE emcee_id = ?`).bind(newEmceeId, oldEmceeId),
    db.prepare("DELETE FROM line_speakers WHERE emcee_id = ?").bind(oldEmceeId),
  ]);
  return { data: null, error: null };
}

export class D1CompatClient {
  from(table: string): D1QueryBuilder { return new D1QueryBuilder(table); }
  rpc(name: string, args?: Row, options?: { count?: "exact" }): D1RpcBuilder { return new D1RpcBuilder(name, args, options); }
}
