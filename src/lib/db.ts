import { Pool, QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// Singleton pool instance
let pool: Pool;

// Define a type for the global object to avoid 'any'
interface GlobalWithPool {
  pool?: Pool;
}

const globalWithPool = global as unknown as GlobalWithPool;

if (process.env.NODE_ENV === "production") {
  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase in many environments
    },
  });
} else {
  // In development, use a global variable to preserve the pool across HMR
  if (!globalWithPool.pool) {
    globalWithPool.pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  pool = globalWithPool.pool;
}

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: (string | number | boolean | null | string[] | number[])[]
  ) => pool.query<T>(text, params),
  pool,
};
