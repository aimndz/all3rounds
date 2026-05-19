import { getBetterAuth } from "@/lib/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  return toNextJsHandler(getBetterAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getBetterAuth()).POST(request);
}
