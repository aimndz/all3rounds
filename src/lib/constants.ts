export const ROUND_OPTIONS = [
  { id: "1", label: "R1" },
  { id: "2", label: "R2" },
  { id: "3", label: "R3" },
  { id: "4", label: "OT" },
] as const;

export const SPEAKER_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {};

export const COLOR_PALETTE = [
  {
    bg: "bg-amber-500/8 dark:bg-amber-400/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  {
    bg: "bg-sky-500/8 dark:bg-sky-400/10",
    text: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  {
    bg: "bg-emerald-500/8 dark:bg-emerald-400/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    bg: "bg-violet-500/8 dark:bg-violet-400/10",
    text: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  {
    bg: "bg-rose-500/8 dark:bg-rose-400/10",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  {
    bg: "bg-teal-500/8 dark:bg-teal-400/10",
    text: "text-teal-700 dark:text-teal-300",
    dot: "bg-teal-500",
  },
  {
    bg: "bg-orange-500/8 dark:bg-orange-400/10",
    text: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  {
    bg: "bg-indigo-500/8 dark:bg-indigo-400/10",
    text: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
  },
] as const;

export function getSpeakerColor(speaker: string, index: number) {
  if (!SPEAKER_COLORS[speaker]) {
    SPEAKER_COLORS[speaker] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  }
  return SPEAKER_COLORS[speaker];
}
