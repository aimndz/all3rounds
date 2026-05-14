import { betterAuth } from "@/lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(betterAuth);
