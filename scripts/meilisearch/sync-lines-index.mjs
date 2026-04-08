import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Meilisearch } from "meilisearch";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..", "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnvFiles() {
  loadEnvFile(path.join(APP_ROOT, ".env"));
  loadEnvFile(path.join(APP_ROOT, ".env.local"));
  loadEnvFile(path.join(APP_ROOT, ".dev.vars.development"));
}

loadLocalEnvFiles();

const DEFAULT_INDEX_UID = process.env.MEILISEARCH_INDEX_UID || "transcript_lines";
const DEFAULT_SUGGEST_INDEX_UID =
  process.env.MEILISEARCH_SUGGEST_INDEX_UID || "transcript_line_suggestions";
const BATCH_SIZE = Number.parseInt(
  process.env.MEILISEARCH_SYNC_BATCH_SIZE || "1000",
  10,
);
const START_AFTER_ID = Number.parseInt(
  process.env.MEILISEARCH_SYNC_START_AFTER_ID || "0",
  10,
);
const SUGGESTION_STOPWORDS = new Set([
  "ang",
  "ba",
  "ka",
  "ko",
  "kung",
  "na",
  "ng",
  "nang",
  "ni",
  "nya",
  "sa",
  "si",
  "the",
  "yung",
]);

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function normalizeValue(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNullableValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeValue(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(values) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => normalizeNullableValue(value))
        .filter(Boolean),
    ),
  );
}

function toUnixTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getBattleStatusRank(status) {
  switch (status) {
    case "reviewed":
      return 4;
    case "reviewing":
      return 3;
    case "arranged":
      return 2;
    case "raw":
      return 1;
    default:
      return 0;
  }
}

function buildEmceeSynonyms(emcees) {
  const synonyms = {};

  for (const emcee of emcees) {
    const variants = normalizeStringArray([emcee.name, ...(emcee.aka || [])]);

    if (variants.length < 2) {
      continue;
    }

    for (const variant of variants) {
      synonyms[variant] = variants.filter((candidate) => candidate !== variant);
    }
  }

  return synonyms;
}

function normalizeSuggestionText(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSuggestionContent(content) {
  return normalizeSuggestionText(content)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function isSuggestionToken(token) {
  if (!token || token.length < 2) {
    return false;
  }

  if (SUGGESTION_STOPWORDS.has(token)) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(token);
}

function extractSuggestionCandidates(content) {
  const tokens = tokenizeSuggestionContent(content);
  const candidates = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (!isSuggestionToken(tokens[index])) {
      continue;
    }

    for (let width = 1; width <= 3; width += 1) {
      const phraseTokens = tokens.slice(index, index + width);
      if (phraseTokens.length !== width) {
        continue;
      }

      if (!phraseTokens.every(isSuggestionToken)) {
        continue;
      }

      const phrase = phraseTokens.join(" ");
      if (phrase.length < 1 || phrase.length > 48) {
        continue;
      }

      candidates.add(phrase);
    }
  }

  return Array.from(candidates);
}

function incrementSuggestionCounts(suggestionCounts, content) {
  const candidates = extractSuggestionCandidates(content);
  for (const phrase of candidates) {
    suggestionCounts.set(phrase, (suggestionCounts.get(phrase) || 0) + 1);
  }
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function ensureIndex(client, indexUid, synonyms) {
  try {
    await client.getRawIndex(indexUid);
  } catch {
    const createTask = await client.createIndex(indexUid, { primaryKey: "id" });
    await client.tasks.waitForTask(createTask, {
      timeout: 60_000,
      interval: 500,
    });
  }

  const index = client.index(indexUid);
  const settingsTask = await index.updateSettings({
    searchableAttributes: [
      "content",
      "battle_title",
      "battle_event_name",
      "emcee_name",
      "speaker_names_search",
      "emcee_aliases_search",
      "speaker_aliases_search",
    ],
    filterableAttributes: [
      "emcee_name_filter",
      "speaker_names_filter",
      "emcee_aliases_filter",
      "speaker_aliases_filter",
      "battle_title_filter",
      "battle_event_name_filter",
      "battle_status",
      "battle_event_year",
    ],
    sortableAttributes: ["battle_event_date", "battle_event_timestamp", "id"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
      "battle_status_rank:desc",
      "battle_event_timestamp:desc",
      "id:desc",
    ],
    synonyms,
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8,
      },
      disableOnNumbers: true,
      disableOnAttributes: [
        "emcee_name_filter",
        "speaker_names_filter",
        "emcee_aliases_filter",
        "speaker_aliases_filter",
        "battle_title_filter",
        "battle_event_name_filter",
      ],
    },
    facetSearch: true,
  });

  await client.tasks.waitForTask(settingsTask, {
    timeout: 60_000,
    interval: 500,
  });

  return index;
}

async function ensureSuggestionIndex(client, indexUid) {
  try {
    await client.getRawIndex(indexUid);
  } catch {
    const createTask = await client.createIndex(indexUid, { primaryKey: "id" });
    await client.tasks.waitForTask(createTask, {
      timeout: 60_000,
      interval: 500,
    });
  }

  const index = client.index(indexUid);
  const settingsTask = await index.updateSettings({
    searchableAttributes: ["phrase"],
    sortableAttributes: ["line_count", "token_count"],
    rankingRules: ["words", "sort", "exactness"],
    typoTolerance: {
      enabled: false,
    },
  });

  await client.tasks.waitForTask(settingsTask, {
    timeout: 60_000,
    interval: 500,
  });

  return index;
}

async function fetchAllRows(supabase, table, ids, columns, idColumn = "id") {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in(idColumn, ids);

  if (error) {
    throw error;
  }

  return data || [];
}

async function main() {
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const meilisearchHost = getRequiredEnv("MEILISEARCH_HOST");
  const meilisearchAdminKey = getRequiredEnv("MEILISEARCH_ADMIN_KEY");

  const supabase = createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const meilisearch = new Meilisearch({
    host: meilisearchHost,
    apiKey: meilisearchAdminKey,
    timeout: 10_000,
  });

  const { data: allEmcees, error: allEmceesError } = await supabase
    .from("emcees")
    .select("id, name, aka");

  if (allEmceesError) {
    throw allEmceesError;
  }

  const emceeMap = new Map(
    (allEmcees || []).map((emcee) => [
      emcee.id,
      {
        id: emcee.id,
        name: emcee.name,
        aka: normalizeStringArray(emcee.aka || []),
      },
    ]),
  );
  const index = await ensureIndex(
    meilisearch,
    DEFAULT_INDEX_UID,
    buildEmceeSynonyms(allEmcees || []),
  );
  const shouldRebuildSuggestionIndex = START_AFTER_ID <= 0;
  const suggestionCounts = shouldRebuildSuggestionIndex ? new Map() : null;
  const suggestionIndex = shouldRebuildSuggestionIndex
    ? await ensureSuggestionIndex(meilisearch, DEFAULT_SUGGEST_INDEX_UID)
    : null;

  if (!shouldRebuildSuggestionIndex) {
    console.log(
      `Skipping suggestion index rebuild while resuming after id ${START_AFTER_ID}.`,
    );
  }

  let lastSeenId = Number.isFinite(START_AFTER_ID) ? START_AFTER_ID : 0;
  let totalIndexed = 0;
  let batchNumber = 0;

  console.log(
    `Syncing Supabase transcript lines to Meilisearch index "${DEFAULT_INDEX_UID}" using keyset pagination after id ${lastSeenId}`,
  );

  while (true) {
    const { data: lines, error: linesError } = await supabase
      .from("lines")
      .select(
        "id, content, start_time, end_time, round_number, speaker_label, emcee_id, speaker_ids, battle_id",
      )
      .gt("id", lastSeenId)
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (linesError) {
      throw linesError;
    }

    if (!lines || lines.length === 0) {
      break;
    }

    batchNumber += 1;
    lastSeenId = lines[lines.length - 1].id;

    if (suggestionCounts) {
      for (const line of lines) {
        incrementSuggestionCounts(suggestionCounts, line.content);
      }
    }

    const battleIds = Array.from(
      new Set(lines.map((line) => line.battle_id).filter(Boolean)),
    );
    const battles = await fetchAllRows(
      supabase,
      "battles",
      battleIds,
      "id, title, youtube_id, event_name, event_date, status",
    );

    const battleMap = new Map(
      battles.map((battle) => [battle.id, battle]),
    );

    const documents = lines.flatMap((line) => {
      const battle = battleMap.get(line.battle_id);

      if (!battle) {
        return [];
      }

      const directEmcee = line.emcee_id ? emceeMap.get(line.emcee_id) : null;
      const speakerRecords = (line.speaker_ids || [])
        .map((speakerId) => emceeMap.get(speakerId))
        .filter(Boolean);
      const speakerNames = normalizeStringArray(
        speakerRecords.map((speaker) => speaker.name),
      );
      const emceeAliases = normalizeStringArray(directEmcee?.aka || []);
      const speakerAliases = normalizeStringArray(
        speakerRecords.flatMap((speaker) => speaker.aka || []),
      );
      const battleEventYear =
        typeof battle.event_date === "string" && battle.event_date.length >= 4
          ? Number.parseInt(battle.event_date.slice(0, 4), 10)
          : null;

      return [
        {
          id: line.id,
          content: line.content,
          start_time: line.start_time,
          end_time: line.end_time,
          round_number: line.round_number,
          speaker_label: line.speaker_label,
          emcee_id: line.emcee_id,
          emcee_name: directEmcee?.name || null,
          speaker_ids: line.speaker_ids || null,
          battle_id: battle.id,
          battle_title: battle.title,
          battle_youtube_id: battle.youtube_id,
          battle_event_name: battle.event_name,
          battle_event_date: battle.event_date,
          battle_status: battle.status,
          battle_status_rank: getBattleStatusRank(battle.status),
          battle_event_timestamp: toUnixTimestamp(battle.event_date),
          battle_event_year:
            Number.isFinite(battleEventYear) ? battleEventYear : null,
          emcee_name_filter: normalizeNullableValue(directEmcee?.name),
          speaker_names_filter: speakerNames,
          emcee_aliases_filter: emceeAliases,
          speaker_aliases_filter: speakerAliases,
          battle_title_filter: normalizeNullableValue(battle.title),
          battle_event_name_filter: normalizeNullableValue(battle.event_name),
          speaker_names_search: speakerNames,
          emcee_aliases_search: emceeAliases,
          speaker_aliases_search: speakerAliases,
        },
      ];
    });

    if (documents.length > 0) {
      const task = await index.addDocuments(documents);
      await meilisearch.tasks.waitForTask(task, {
        timeout: 60_000,
        interval: 500,
      });
      totalIndexed += documents.length;
    }

    console.log(
      `Batch ${batchNumber}: indexed ${documents.length} documents (last id ${lastSeenId})`,
    );
  }

  console.log(
    `Done. Indexed ${totalIndexed} transcript lines into "${DEFAULT_INDEX_UID}".`,
  );

  if (suggestionIndex && suggestionCounts) {
    const clearTask = await suggestionIndex.deleteAllDocuments();
    await meilisearch.tasks.waitForTask(clearTask, {
      timeout: 60_000,
      interval: 500,
    });

    const suggestionDocuments = Array.from(suggestionCounts.entries())
      .map(([phrase, lineCount]) => ({
        id: phrase,
        phrase,
        normalized_phrase: phrase,
        line_count: lineCount,
        token_count: phrase.split(" ").length,
      }))
      .sort((left, right) => {
        if (right.line_count !== left.line_count) {
          return right.line_count - left.line_count;
        }

        if (left.token_count !== right.token_count) {
          return left.token_count - right.token_count;
        }

        return left.phrase.localeCompare(right.phrase);
      });

    let suggestionBatchNumber = 0;
    let totalSuggestionsIndexed = 0;

    for (const batch of chunkArray(suggestionDocuments, 5000)) {
      suggestionBatchNumber += 1;
      const task = await suggestionIndex.addDocuments(batch);
      await meilisearch.tasks.waitForTask(task, {
        timeout: 60_000,
        interval: 500,
      });
      totalSuggestionsIndexed += batch.length;
      console.log(
        `Suggestion batch ${suggestionBatchNumber}: indexed ${batch.length} documents`,
      );
    }

    console.log(
      `Done. Indexed ${totalSuggestionsIndexed} suggestions into "${DEFAULT_SUGGEST_INDEX_UID}".`,
    );
  }
}

main().catch((error) => {
  console.error("Meilisearch sync failed:", error);
  process.exitCode = 1;
});

