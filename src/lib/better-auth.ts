import { betterAuth as createBetterAuth } from "better-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { supabaseBetterAuthAdapter } from "@/lib/better-auth-supabase-adapter";

export const betterAuth = createBetterAuth({
  database: supabaseBetterAuthAdapter,
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

export const auth = betterAuth;
