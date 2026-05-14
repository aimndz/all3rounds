import { betterAuth as createBetterAuth } from "better-auth";
import { Pool } from "pg";

const databaseUrl =
  process.env.BETTER_AUTH_DATABASE_URL ?? process.env.DATABASE_URL;

const globalForBetterAuth = globalThis as typeof globalThis & {
  betterAuthPool?: Pool;
};

const pool =
  globalForBetterAuth.betterAuthPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForBetterAuth.betterAuthPool = pool;
}

export const betterAuth = createBetterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  databaseHooks: {
    user: {
      create: {
        async after(user) {
          await pool.query(
            `
              insert into public.user_profiles (id, display_name)
              values ($1, $2)
              on conflict (id) do nothing
            `,
            [user.id, user.name || user.email.split("@")[0] || "User"],
          );
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

export const auth = betterAuth;
