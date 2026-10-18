import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchParamValues = Record<
  string,
  string | string[] | undefined
>;

export function buildQueryString(
  searchParams: SearchParamValues,
  allowedKeys?: readonly string[],
): string {
  const allowed = allowedKeys ? new Set(allowedKeys) : null;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (allowed && !allowed.has(key)) continue;

    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateMedium(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatDateLong(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

export function formatSpeakerName(
  name: string | null | undefined,
  keepUnassigned = false,
): string | null {
  if (!name) return null;
  if (
    !keepUnassigned &&
    (name === "Unknown" ||
      name.toLowerCase().includes("unassigned") ||
      name.toLowerCase().startsWith("speaker"))
  ) {
    return null;
  }
  return name.replace(/_/g, " ");
}

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    return process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://all3rounds.com";
  }
  return raw.startsWith("http") ? raw : `https://${raw}`;
}
