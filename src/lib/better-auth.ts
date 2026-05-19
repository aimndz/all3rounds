import { betterAuth as createBetterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { createAdminClient } from "@/lib/supabase/server";

export function getBetterAuth() {
  return createBetterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
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
            await createAdminClient().from("user_profiles").upsert(
              {
                id: user.id,
                display_name: user.name || user.email.split("@")[0] || "User",
              },
              { onConflict: "id", ignoreDuplicates: true },
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
}
