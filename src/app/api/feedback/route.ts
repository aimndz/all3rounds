import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { feedback } from "@/db/schema";
import { getUserWithRole } from "@/lib/auth";
import { verifyCsrf } from "@/lib/csrf";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254)
    .nullable()
    .optional(),
);

const optionalUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .url("Invalid page URL.")
    .refine((value) => {
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Page URL must use http or https.")
    .max(2048)
    .nullable()
    .optional(),
);

const FeedbackSchema = z.object({
  category: z.enum(["bug", "content", "feature", "data", "account", "other"], {
    message: "Choose a feedback category.",
  }),
  message: z
    .string()
    .trim()
    .min(5, "Feedback must be at least 5 characters.")
    .max(2000, "Feedback must be 2000 characters or fewer."),
  contact_email: optionalEmailSchema,
  page_url: optionalUrlSchema,
  turnstile_token: z
    .string()
    .trim()
    .min(1, "Complete the verification before submitting feedback.")
    .max(2048, "Invalid verification token."),
});

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
};

async function verifyTurnstileToken(token: string, remoteIp: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");
    return false;
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  formData.append("remoteip", remoteIp);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      console.error("Turnstile verification request failed:", response.status);
      return false;
    }

    const result = (await response.json()) as TurnstileVerifyResponse;
    if (!result.success) {
      console.warn("Turnstile verification failed:", result["error-codes"]);
    }

    return result.success;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  }

  const { user } = await getUserWithRole();
  const clientIp = getClientIp(request);
  const rateKey = user?.id ?? clientIp;
  const rateRes = await checkRateLimit(`feedback:${rateKey}`, "feedback");
  if (!rateRes.allowed) {
    return NextResponse.json(
      { error: "Feedback limit reached. Please try again later." },
      { status: 429, headers: getRateLimitHeaders(rateRes) },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const verified = await verifyTurnstileToken(
    parsed.data.turnstile_token,
    clientIp,
  );
  if (!verified) {
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 400 },
    );
  }

  try {
    await getDb().insert(feedback).values({
      id: crypto.randomUUID(),
      userId: user?.id ?? null,
      category: parsed.data.category,
      message: parsed.data.message,
      contactEmail: parsed.data.contact_email ?? null,
      pageUrl: parsed.data.page_url ?? null,
      userAgent: request.headers.get("user-agent"),
      status: "new",
    });
  } catch (error) {
    console.error("Insert feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
