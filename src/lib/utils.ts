import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
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
