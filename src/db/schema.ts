import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const emcees = sqliteTable(
  "emcees",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    akaJson: text("aka_json").notNull().default("[]"),
    battleCount: integer("battle_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    slugKey: uniqueIndex("emcees_slug_key").on(table.slug),
    nameIdx: index("idx_emcees_name").on(table.name),
  }),
);

export const emceeAliases = sqliteTable(
  "emcee_aliases",
  {
    emceeId: text("emcee_id")
      .notNull()
      .references(() => emcees.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    aliasNormalized: text("alias_normalized").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.emceeId, table.alias] }),
    aliasIdx: index("idx_emcee_aliases_normalized").on(table.aliasNormalized),
  }),
);

export const battles = sqliteTable(
  "battles",
  {
    id: text("id").primaryKey(),
    league: text("league").notNull().default("fliptop"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    youtubeId: text("youtube_id").notNull(),
    eventName: text("event_name"),
    eventDate: text("event_date"),
    status: text("status").notNull().default("raw"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    youtubeKey: uniqueIndex("battles_youtube_id_key").on(table.youtubeId),
    routeKey: uniqueIndex("battles_league_slug_key").on(table.league, table.slug),
    statusIdx: index("idx_battles_status").on(table.status),
    eventDateIdx: index("idx_battles_event_date").on(table.eventDate),
    statusEventDateIdx: index("idx_battles_status_event_date").on(table.status, table.eventDate),
    eventNameEventDateIdx: index("idx_battles_event_name_event_date").on(table.eventName, table.eventDate),
    statusEventNameEventDateIdx: index("idx_battles_status_event_name_event_date").on(
      table.status,
      table.eventName,
      table.eventDate,
    ),
  }),
);

export const battleParticipants = sqliteTable(
  "battle_participants",
  {
    id: text("id").primaryKey(),
    battleId: text("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    emceeId: text("emcee_id")
      .notNull()
      .references(() => emcees.id, { onDelete: "cascade" }),
    label: text("label"),
  },
  (table) => ({
    uniquePair: uniqueIndex("battle_participants_unique_pair").on(
      table.battleId,
      table.emceeId,
    ),
    battleIdx: index("idx_battle_participants_battle_id").on(table.battleId),
    emceeIdx: index("idx_battle_participants_emcee_id").on(table.emceeId),
  }),
);

export const lines = sqliteTable(
  "lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    battleId: text("battle_id")
      .notNull()
      .references(() => battles.id, { onDelete: "cascade" }),
    emceeId: text("emcee_id").references(() => emcees.id, {
      onDelete: "set null",
    }),
    roundNumber: integer("round_number"),
    speakerLabel: text("speaker_label"),
    content: text("content").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    battleIdx: index("idx_lines_battle_id").on(table.battleId),
    emceeIdx: index("idx_lines_emcee_id").on(table.emceeId),
    battleStartIdx: index("idx_lines_battle_start").on(table.battleId, table.startTime),
  }),
);

export const lineSpeakers = sqliteTable(
  "line_speakers",
  {
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    emceeId: text("emcee_id")
      .notNull()
      .references(() => emcees.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.lineId, table.emceeId] }),
    lineIdx: index("idx_line_speakers_line_id").on(table.lineId),
    emceeIdx: index("idx_line_speakers_emcee_id").on(table.emceeId),
  }),
);

export const editHistory = sqliteTable(
  "edit_history",
  {
    id: text("id").primaryKey(),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    fieldChanged: text("field_changed").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    lineIdx: index("idx_edit_history_line_id").on(table.lineId),
    createdAtIdx: index("idx_edit_history_created_at").on(table.createdAt),
  }),
);

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => ({
    userIdx: index("session_userId_idx").on(table.userId),
  }),
);

export const accounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    userIdx: index("account_userId_idx").on(table.userId),
  }),
);

export const verifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier),
  }),
);

export const userProfiles = sqliteTable(
  "user_profiles",
  {
    id: text("id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("viewer"),
    trustLevel: text("trust_level").notNull().default("new"),
    displayName: text("display_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    roleIdx: index("idx_user_profiles_role").on(table.role),
    trustIdx: index("idx_user_profiles_trust").on(table.trustLevel),
  }),
);

export const suggestions = sqliteTable(
  "suggestions",
  {
    id: text("id").primaryKey(),
    lineId: integer("line_id")
      .notNull()
      .references(() => lines.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    suggestedContent: text("suggested_content").notNull(),
    originalContent: text("original_content").notNull(),
    status: text("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => userProfiles.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    lineIdx: index("idx_suggestions_line_id").on(table.lineId),
    statusIdx: index("idx_suggestions_status").on(table.status),
    statusReviewedAtIdx: index("idx_suggestions_status_reviewed_at").on(table.status, table.reviewedAt),
    userIdx: index("idx_suggestions_user_id").on(table.userId),
  }),
);

export const videoProcessingStatus = sqliteTable(
  "video_processing_status",
  {
    youtubeId: text("youtube_id").primaryKey(),
    status: text("status").notNull(),
    workerId: text("worker_id"),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    statusIdx: index("idx_vps_status").on(table.status),
    updatedIdx: index("idx_vps_updated_at").on(table.updatedAt),
  }),
);
