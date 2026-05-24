import { getCloudflareContext } from "@opennextjs/cloudflare";
import { type AnyD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

declare global {
  interface CloudflareEnv {
    DB: AnyD1Database;
  }
}

export function getD1() {
  const db = getCloudflareContext().env.DB;
  if (!db) {
    throw new Error("Cloudflare D1 binding `DB` is not configured.");
  }
  return db;
}

export async function getD1Async() {
  const db = (await getCloudflareContext({ async: true })).env.DB;
  if (!db) {
    throw new Error("Cloudflare D1 binding `DB` is not configured.");
  }
  return db;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}
